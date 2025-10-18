import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const createStockMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'RETURN']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  targetWarehouseId: z.string().optional()
})

// POST /api/stock/[id]/movements
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: stockItemId } = await params
    const body = await request.json()
    
    console.log('Stock movement request:', { stockItemId, body })
    
    // Validate the request body
    const movementData = createStockMovementSchema.parse(body)
    console.log('Validated movement data:', movementData)
    
    // Check if stock item exists and get current stock
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            merchantId: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!stockItem) {
      return createErrorResponse('Stock item not found', 404)
    }

    // Check permissions - merchant staff can only modify their own products
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF' && stockItem.product.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Map movement type to database enum
    const movementTypeMap = {
      'IN': 'STOCK_IN',
      'OUT': 'STOCK_OUT',
      'ADJUSTMENT': 'ADJUSTMENT',
      'TRANSFER': 'TRANSFER',
      'DAMAGE': 'DAMAGE',
      'RETURN': 'RETURN'
    }

    const movementType = movementTypeMap[movementData.type]

    // Calculate new quantities
    let newQuantity = stockItem.quantity
    let newAvailableQuantity = stockItem.availableQuantity
    let newReservedQuantity = stockItem.reservedQuantity

    switch (movementData.type) {
      case 'IN':
        newQuantity += movementData.quantity
        newAvailableQuantity += movementData.quantity
        break
      case 'OUT':
        if (movementData.quantity > newAvailableQuantity) {
          return createErrorResponse('Insufficient available stock', 400)
        }
        newQuantity -= movementData.quantity
        newAvailableQuantity -= movementData.quantity
        break
      case 'ADJUSTMENT':
        newQuantity = movementData.quantity
        newAvailableQuantity = movementData.quantity - newReservedQuantity
        if (newAvailableQuantity < 0) {
          return createErrorResponse('Adjustment would result in negative available stock', 400)
        }
        break
      case 'DAMAGE':
        if (movementData.quantity > newAvailableQuantity) {
          return createErrorResponse('Insufficient available stock to damage', 400)
        }
        newQuantity -= movementData.quantity
        newAvailableQuantity -= movementData.quantity
        break
      case 'RETURN':
        newQuantity += movementData.quantity
        newAvailableQuantity += movementData.quantity
        break
      case 'TRANSFER':
        // For transfers, we assume stock is moving out of this location
        if (movementData.quantity > newAvailableQuantity) {
          return createErrorResponse('Insufficient available stock for transfer', 400)
        }
        if (!movementData.targetWarehouseId) {
          return createErrorResponse('Target warehouse is required for transfers', 400)
        }
        newQuantity -= movementData.quantity
        newAvailableQuantity -= movementData.quantity
        break
    }

    // Update stock item and create movement record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update stock item
      const updatedStockItem = await tx.stockItem.update({
        where: { id: stockItemId },
        data: {
          quantity: newQuantity,
          availableQuantity: newAvailableQuantity,
          reservedQuantity: newReservedQuantity,
          lastStockIn: movementData.type === 'IN' ? new Date() : stockItem.lastStockIn,
          lastStockOut: movementData.type === 'OUT' ? new Date() : stockItem.lastStockOut,
          updatedAt: new Date()
        }
      })

      // Create stock movement record
      const stockMovement = await tx.stockMovement.create({
        data: {
          stockItemId: stockItemId,
          movementType: movementType,
          quantity: movementData.quantity,
          referenceType: movementData.reason,
          referenceId: movementData.reference || null,
          reason: movementData.reason,
          performedBy: user.userId,
          notes: movementData.notes || null
        }
      })

      // For transfers, create stock in target warehouse
      let targetStockItem = null
      if (movementData.type === 'TRANSFER' && movementData.targetWarehouseId) {
        // Check if stock item already exists in target warehouse
        const existingTargetStock = await tx.stockItem.findFirst({
          where: {
            productId: stockItem.productId,
            warehouseId: movementData.targetWarehouseId
          }
        })

        if (existingTargetStock) {
          // Update existing stock in target warehouse
          targetStockItem = await tx.stockItem.update({
            where: { id: existingTargetStock.id },
            data: {
              quantity: { increment: movementData.quantity },
              availableQuantity: { increment: movementData.quantity }
            }
          })
        } else {
          // Create new stock item in target warehouse
          targetStockItem = await tx.stockItem.create({
            data: {
              productId: stockItem.productId,
              warehouseId: movementData.targetWarehouseId,
              quantity: movementData.quantity,
              availableQuantity: movementData.quantity,
              reservedQuantity: 0,
              reorderLevel: stockItem.reorderLevel,
              maxStockLevel: stockItem.maxStockLevel
            }
          })
        }

        // Create stock movement record for target warehouse
        await tx.stockMovement.create({
          data: {
            stockItemId: targetStockItem.id,
            movementType: 'STOCK_IN',
            quantity: movementData.quantity,
            referenceType: 'TRANSFER_IN',
            referenceId: stockMovement.id,
            reason: 'Transfer from other warehouse',
            performedBy: user.userId,
            notes: `Transferred from ${stockItem.warehouse?.name || 'warehouse'}`
          }
        })
      }

      return { updatedStockItem, stockMovement, targetStockItem }
    })

    // Log the movement
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'STOCK_MOVEMENT',
        entityType: 'stock_movements',
        entityId: result.stockMovement.id,
        newValues: {
          stockItemId,
          movementType,
          quantity: movementData.quantity,
          reason: movementData.reason,
          newQuantity,
          newAvailableQuantity
        }
      }
    })

    return createResponse({
      stockMovement: result.stockMovement,
      updatedStock: result.updatedStockItem,
      message: `Stock movement recorded successfully. New quantity: ${newQuantity}`
    }, 201, 'Stock movement recorded successfully')

  } catch (error) {
    console.error('Stock movement error:', error)
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return createErrorResponse(`Invalid input data: ${error.errors.map(e => e.message).join(', ')}`, 400)
    }
    return createErrorResponse('Failed to record stock movement', 500)
  }
})

// GET /api/stock/[id]/movements - Get movement history
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: stockItemId } = await params
    
    // Check if stock item exists
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            merchantId: true
          }
        }
      }
    })

    if (!stockItem) {
      return createErrorResponse('Stock item not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF' && stockItem.product.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Get movement history
    const movements = await prisma.stockMovement.findMany({
      where: { stockItemId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 movements
    })

    return createResponse({
      movements,
      stockItem: {
        id: stockItem.id,
        quantity: stockItem.quantity,
        availableQuantity: stockItem.availableQuantity,
        reservedQuantity: stockItem.reservedQuantity,
        product: stockItem.product
      }
    }, 200, 'Stock movement history retrieved successfully')

  } catch (error) {
    console.error('Get stock movements error:', error)
    return createErrorResponse('Failed to retrieve stock movements', 500)
  }
})
