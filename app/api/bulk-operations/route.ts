import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// POST /api/bulk-operations
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF', 'LOGISTICS_PARTNER'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const { type, action, itemIds, data } = body

    if (!type || !action || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return createErrorResponse('Invalid request data', 400)
    }

    let result: { processed: number; failed: number; errors: string[] } = { processed: 0, failed: 0, errors: [] }

    // Build where clause based on user role
    const whereClause: any = {
      id: { in: itemIds }
    }

    if (user.role === 'MERCHANT_ADMIN' && user.merchantId) {
      whereClause.merchantId = user.merchantId
    }

    // For order status updates, only allow admin and logistics staff
    if (type === 'orders' && action === 'update_status') {
      if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF' && user.role !== 'LOGISTICS_PARTNER') {
        return createErrorResponse('Only admin and logistics staff can update order status', 403)
      }
    }

    if (type === 'products') {
      result = await handleProductBulkOperation(action, whereClause, data, user)
    } else if (type === 'orders') {
      result = await handleOrderBulkOperation(action, whereClause, data, user)
    } else {
      return createErrorResponse('Unsupported operation type', 400)
    }

    // Log the bulk operation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: `BULK_${action.toUpperCase()}_${type.toUpperCase()}`,
        entityType: type,
        entityId: itemIds.join(','),
        newValues: { action, itemIds, data, result }
      }
    })

    return createResponse(result, 200, 'Bulk operation completed successfully')

  } catch (error) {
    console.error('Bulk operation error:', error)
    return createErrorResponse('Failed to execute bulk operation', 500)
  }
})

async function handleProductBulkOperation(action: string, whereClause: any, data: any, user: JWTPayload) {
  const result: { processed: number; failed: number; errors: string[] } = { processed: 0, failed: 0, errors: [] }

  try {
    switch (action) {
      case 'activate':
        const activateResult = await prisma.product.updateMany({
          where: { ...whereClause, isActive: false },
          data: { isActive: true }
        })
        result.processed = activateResult.count
        break

      case 'deactivate':
        const deactivateResult = await prisma.product.updateMany({
          where: { ...whereClause, isActive: true },
          data: { isActive: false }
        })
        result.processed = deactivateResult.count
        break

      case 'update_category':
        if (!data.category) {
          throw new Error('Category is required')
        }
        const categoryResult = await prisma.product.updateMany({
          where: whereClause,
          data: { category: data.category }
        })
        result.processed = categoryResult.count
        break

      case 'update_price':
        if (!data.price || data.price <= 0) {
          throw new Error('Valid price is required')
        }
        const priceResult = await prisma.product.updateMany({
          where: whereClause,
          data: { unitPrice: data.price }
        })
        result.processed = priceResult.count
        break

      case 'delete':
        // Delete all related stock movements first
        await prisma.stockMovement.deleteMany({
          where: {
            stockItem: {
              product: {
                id: { in: whereClause.id.in }
              }
            }
          }
        })

        // Delete all related stock items
        await prisma.stockItem.deleteMany({
          where: {
            product: {
              id: { in: whereClause.id.in }
            }
          }
        })

        // Delete the products
        const deleteResult = await prisma.product.deleteMany({
          where: whereClause
        })
        result.processed = deleteResult.count
        break

      default:
        throw new Error('Unsupported product action')
    }
  } catch (error) {
    result.failed = whereClause.id.in.length
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

async function handleOrderBulkOperation(action: string, whereClause: any, data: any, user: JWTPayload) {
  const result: { processed: number; failed: number; errors: string[] } = { processed: 0, failed: 0, errors: [] }

  try {
    switch (action) {
      case 'update_status':
        if (!data.status) {
          throw new Error('Status is required')
        }
        
        const statusResult = await prisma.order.updateMany({
          where: whereClause,
          data: { status: data.status }
        })
        result.processed = statusResult.count

        // Create status history entries
        if (result.processed > 0) {
          const statusHistoryEntries = whereClause.id.in.map((orderId: string) => ({
            orderId,
            status: data.status,
            updatedBy: user.userId,
            notes: `Bulk status update to ${data.status}`
          }))

          await prisma.orderStatusHistory.createMany({
            data: statusHistoryEntries
          })
        }
        break

      case 'assign_warehouse':
        if (!data.warehouseId) {
          throw new Error('Warehouse ID is required')
        }
        
        const warehouseResult = await prisma.order.updateMany({
          where: whereClause,
          data: { warehouseId: data.warehouseId }
        })
        result.processed = warehouseResult.count
        break

      case 'export':
        // This would typically generate and return a file
        // For now, just mark as processed
        result.processed = whereClause.id.in.length
        break

      case 'cancel':
        const cancelResult = await prisma.order.updateMany({
          where: { ...whereClause, status: { not: 'DELIVERED' } },
          data: { status: 'CANCELLED' }
        })
        result.processed = cancelResult.count

        // Create status history entries
        if (result.processed > 0) {
          const statusHistoryEntries = whereClause.id.in.map((orderId: string) => ({
            orderId,
            status: 'CANCELLED',
            updatedBy: user.userId,
            notes: 'Bulk cancellation'
          }))

          await prisma.orderStatusHistory.createMany({
            data: statusHistoryEntries
          })
        }
        break

      default:
        throw new Error('Unsupported order action')
    }
  } catch (error) {
    result.failed = whereClause.id.in.length
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

