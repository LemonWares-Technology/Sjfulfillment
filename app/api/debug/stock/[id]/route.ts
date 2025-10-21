import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/debug/stock/[id] - Get stock item details
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: stockItemId } = await params
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
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

    return createResponse({
      stockItem,
      message: 'Stock item details retrieved'
    }, 200, 'Stock item retrieved successfully')

  } catch (error) {
    console.error('Debug stock error:', error)
    return createErrorResponse('Failed to retrieve stock item', 500)
  }
})

// PUT /api/debug/stock/[id] - Manually update stock quantity
export const PUT = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: stockItemId } = await params
    const body = await request.json()
    const { quantity } = body
    
    if (!quantity || quantity < 0) {
      return createErrorResponse('Valid quantity is required', 400)
    }

    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId }
    })

    if (!stockItem) {
      return createErrorResponse('Stock item not found', 404)
    }

    const updatedStockItem = await prisma.stockItem.update({
      where: { id: stockItemId },
      data: {
        quantity: quantity,
        availableQuantity: quantity,
        reservedQuantity: 0
      }
    })

    return createResponse({
      stockItem: updatedStockItem,
      message: `Stock quantity updated to ${quantity}`
    }, 200, 'Stock quantity updated successfully')

  } catch (error) {
    console.error('Debug stock update error:', error)
    return createErrorResponse('Failed to update stock quantity', 500)
  }
})

