import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(0, 'Quantity must be non-negative')
})

// POST /api/admin/update-stock
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { productId, quantity } = updateStockSchema.parse(body)
    
    console.log('Manual stock update request:', { productId, quantity })
    
    // Find stock items for the product
    const stockItems = await prisma.stockItem.findMany({
      where: { productId },
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
    
    console.log('Found stock items:', stockItems.length)
    
    if (stockItems.length === 0) {
      // Create new stock item
      const warehouse = await prisma.warehouseLocation.findFirst({
        where: { isActive: true }
      })
      
      if (!warehouse) {
        return createErrorResponse('No active warehouse found', 400)
      }
      
      const newStockItem = await prisma.stockItem.create({
        data: {
          productId,
          warehouseId: warehouse.id,
          quantity: quantity,
          availableQuantity: quantity,
          reservedQuantity: 0,
          reorderLevel: 10,
          maxStockLevel: 100
        }
      })
      
      console.log('Created new stock item:', newStockItem.id)
      
      return createResponse({
        message: 'Stock item created successfully',
        stockItem: newStockItem,
        action: 'created'
      }, 201, 'Stock item created')
    } else {
      // Update existing stock items
      const updateResult = await prisma.stockItem.updateMany({
        where: { productId },
        data: {
          quantity: quantity,
          availableQuantity: quantity,
          reservedQuantity: 0
        }
      })
      
      console.log('Updated stock items:', updateResult.count)
      
      return createResponse({
        message: `Updated ${updateResult.count} stock items`,
        updatedCount: updateResult.count,
        action: 'updated'
      }, 200, 'Stock items updated')
    }
    
  } catch (error) {
    console.error('Manual stock update error:', error)
    if (error instanceof z.ZodError) {
      return createErrorResponse(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 400)
    }
    return createErrorResponse('Failed to update stock', 500)
  }
})

