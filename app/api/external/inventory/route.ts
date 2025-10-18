import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  quantity: z.number().int('Quantity must be an integer'),
  movementType: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  costPrice: z.number().positive().optional()
})

// GET /api/external/inventory - Get inventory levels
export const GET = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'inventory:read')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/inventory',
        'GET',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100 per page
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const lowStock = searchParams.get('lowStock') === 'true'

    const where: any = {
      product: {
        merchantId: apiKey.merchantId
      }
    }

    if (productId) where.productId = productId
    if (warehouseId) where.warehouseId = warehouseId
    if (lowStock) {
      where.availableQuantity = { lte: prisma.stockItem.fields.reorderLevel }
    }

    const skip = (page - 1) * limit

    const [stockItems, total] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          quantity: true,
          availableQuantity: true,
          reservedQuantity: true,
          reorderLevel: true,
          maxStockLevel: true,
          batchNumber: true,
          expiryDate: true,
          location: true,
          costPrice: true,
          lastStockIn: true,
          lastStockOut: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              description: true,
              category: true,
              brand: true,
              unitPrice: true,
              images: true
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.stockItem.count({ where })
    ])

    const response = {
      inventory: stockItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/inventory',
      'GET',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      response
    )

    return createResponse(response, 200, 'Inventory retrieved successfully')
  } catch (error) {
    console.error('External get inventory error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/inventory',
      'GET',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to retrieve inventory', 500)
  }
})

// POST /api/external/inventory - Update inventory levels
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'inventory:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/inventory',
        'POST',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const body = await request.json()
    const validatedData = updateInventorySchema.parse(body)

    // Check if product exists and belongs to merchant
    const product = await prisma.product.findFirst({
      where: {
        id: validatedData.productId,
        merchantId: apiKey.merchantId,
        isActive: true
      }
    })

    if (!product) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/inventory',
        'POST',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Product not found or inactive'
      )
      return createErrorResponse('Product not found or inactive', 404)
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: validatedData.warehouseId }
    })

    if (!warehouse) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/inventory',
        'POST',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Warehouse not found'
      )
      return createErrorResponse('Warehouse not found', 404)
    }

    // Find or create stock item
    let stockItem = await prisma.stockItem.findFirst({
      where: {
        productId: validatedData.productId,
        warehouseId: validatedData.warehouseId,
        batchNumber: validatedData.batchNumber || null
      }
    })

    if (!stockItem) {
      // Create new stock item
      stockItem = await prisma.stockItem.create({
        data: {
          productId: validatedData.productId,
          warehouseId: validatedData.warehouseId,
          quantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          batchNumber: validatedData.batchNumber,
          expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
          costPrice: validatedData.costPrice
        }
      })
    }

    // Calculate new quantities based on movement type
    let newQuantity = stockItem.quantity
    let newAvailableQuantity = stockItem.availableQuantity

    switch (validatedData.movementType) {
      case 'STOCK_IN':
        newQuantity += validatedData.quantity
        newAvailableQuantity += validatedData.quantity
        break
      case 'STOCK_OUT':
        if (newAvailableQuantity < validatedData.quantity) {
          await logApiRequest(
            apiKey.apiKeyId,
            '/api/external/inventory',
            'POST',
            400,
            Date.now() - startTime,
            request.headers.get('x-forwarded-for') || 'unknown',
            request.headers.get('user-agent') || 'unknown',
            body,
            null,
            'Insufficient stock available'
          )
          return createErrorResponse('Insufficient stock available', 400)
        }
        newQuantity -= validatedData.quantity
        newAvailableQuantity -= validatedData.quantity
        break
      case 'ADJUSTMENT':
        newQuantity = validatedData.quantity
        newAvailableQuantity = Math.max(0, validatedData.quantity - stockItem.reservedQuantity)
        break
    }

    // Update stock item
    const updatedStockItem = await prisma.stockItem.update({
      where: { id: stockItem.id },
      data: {
        quantity: newQuantity,
        availableQuantity: newAvailableQuantity,
        costPrice: validatedData.costPrice || stockItem.costPrice,
        lastStockIn: validatedData.movementType === 'STOCK_IN' ? new Date() : stockItem.lastStockIn,
        lastStockOut: validatedData.movementType === 'STOCK_OUT' ? new Date() : stockItem.lastStockOut
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            category: true,
            brand: true,
            unitPrice: true,
            images: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true
          }
        }
      }
    })

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        stockItemId: stockItem.id,
        movementType: validatedData.movementType,
        quantity: Math.abs(validatedData.quantity),
        referenceType: 'API_UPDATE',
        referenceId: stockItem.id,
        reason: validatedData.reason,
        notes: validatedData.notes || `Inventory updated via external API`,
        performedBy: `API_KEY_${apiKey.apiKeyId}`
      }
    })

    const response = {
      id: updatedStockItem.id,
      quantity: updatedStockItem.quantity,
      availableQuantity: updatedStockItem.availableQuantity,
      reservedQuantity: updatedStockItem.reservedQuantity,
      reorderLevel: updatedStockItem.reorderLevel,
      maxStockLevel: updatedStockItem.maxStockLevel,
      batchNumber: updatedStockItem.batchNumber,
      expiryDate: updatedStockItem.expiryDate,
      location: updatedStockItem.location,
      costPrice: updatedStockItem.costPrice,
      lastStockIn: updatedStockItem.lastStockIn,
      lastStockOut: updatedStockItem.lastStockOut,
      updatedAt: updatedStockItem.updatedAt,
      product: updatedStockItem.product,
      warehouse: updatedStockItem.warehouse
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/inventory',
      'POST',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      response
    )

    return createResponse(response, 200, 'Inventory updated successfully')
  } catch (error) {
    console.error('External update inventory error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/inventory',
      'POST',
      statusCode,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      errorMessage
    )

    return createErrorResponse(errorMessage, statusCode)
  }
})
