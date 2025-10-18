import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateOrderStatusSchema } from '../../../lib/validations'
import { notificationService, NotificationTemplates } from '../../../lib/notification-service'

// GET /api/orders/[id]
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF', 'LOGISTICS_PARTNER'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true
          }
        },
        orderItems: {
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
            }
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        orderSplits: true,
        returns: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // Check permissions
    console.log('Order access check:', {
      userRole: user.role,
      orderMerchantId: order.merchantId,
      userMerchantId: user.merchantId,
      isAdmin: user.role === 'SJFS_ADMIN',
      isLogistics: user.role === 'LOGISTICS_PARTNER',
      isWarehouseStaff: user.role === 'WAREHOUSE_STAFF',
      merchantMatch: order.merchantId === user.merchantId
    })
    
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'LOGISTICS_PARTNER' && user.role !== 'WAREHOUSE_STAFF' && order.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    return createResponse(order, 200, 'Order retrieved successfully')
  } catch (error) {
    console.error('Get order error:', error)
    return createErrorResponse('Failed to retrieve order', 500)
  }
})

// PUT /api/orders/[id]
export const PUT = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF', 'LOGISTICS_PARTNER'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const updateData = updateOrderStatusSchema.parse(body)

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, merchantId: true, status: true, orderNumber: true }
    })

    if (!existingOrder) {
      return createErrorResponse('Order not found', 404)
    }

    // Check permissions - Only admin and logistics staff can update order status
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'LOGISTICS_PARTNER' && user.role !== 'WAREHOUSE_STAFF') {
      return createErrorResponse('Only admin and logistics staff can update order status', 403)
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Create status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: updateData.status,
        updatedBy: user.userId,
        notes: updateData.notes || `Status updated to ${updateData.status}`
      }
    })

    // Handle status-specific logic
    if (updateData.status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { deliveredAt: new Date() }
      })
    }

    // Log the change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'orders',
        entityId: orderId,
        newValues: updateData
      }
    })

    // Send notifications based on status change
    try {
      if (updateData.status === 'DELIVERED') {
        // Notify merchant about delivery
        await notificationService.createRoleNotification({
          ...NotificationTemplates.ORDER_DELIVERED(updatedOrder.orderNumber, updatedOrder.customerName),
          recipientRole: 'MERCHANT_ADMIN',
          metadata: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            merchantId: updatedOrder.merchantId,
            deliveredAt: new Date().toISOString()
          }
        })
      } else if (updateData.status === 'CANCELLED') {
        // Notify all relevant parties about cancellation
        await notificationService.createRoleNotification({
          title: 'Order Cancelled',
          message: `Order ${updatedOrder.orderNumber} has been cancelled`,
          type: 'ORDER_CANCELLED',
          priority: 'HIGH',
          recipientRole: 'MERCHANT_ADMIN',
          metadata: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            merchantId: updatedOrder.merchantId,
            cancelledAt: new Date().toISOString()
          }
        })
      } else {
        // General order update notification
        await notificationService.createRoleNotification({
          title: 'Order Status Updated',
          message: `Order ${updatedOrder.orderNumber} status updated to ${updateData.status}`,
          type: 'ORDER_UPDATED',
          priority: 'MEDIUM',
          recipientRole: 'MERCHANT_ADMIN',
          metadata: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            merchantId: updatedOrder.merchantId,
            newStatus: updateData.status,
            updatedAt: new Date().toISOString()
          }
        })
      }
    } catch (notificationError) {
      console.error('Error sending order status update notifications:', notificationError)
      // Don't fail the order update if notifications fail
    }

    return createResponse(updatedOrder, 200, 'Order updated successfully')
  } catch (error) {
    console.error('Update order error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update order', 500)
  }
})

// POST /api/orders/[id]/split
export const POST = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const { warehouseId, items } = body

    if (!warehouseId || !items || !Array.isArray(items)) {
      return createErrorResponse('Warehouse ID and items are required', 400)
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: { id: true, sku: true, name: true }
            }
          }
        }
      }
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, code: true }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Validate items belong to order
    const orderItemIds = order.orderItems.map((item: any) => item.id)
    const validItems = items.filter((item: any) => orderItemIds.includes(item.orderItemId))
    
    if (validItems.length !== items.length) {
      return createErrorResponse('Some items do not belong to this order', 400)
    }

    // Create order split
    const orderSplit = await prisma.orderSplit.create({
      data: {
        originalOrderId: orderId,
        warehouseId,
        status: 'PENDING'
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'CREATE_ORDER_SPLIT',
        entityType: 'order_splits',
        entityId: orderSplit.id,
        newValues: { warehouseId, items }
      }
    })

    return createResponse(orderSplit, 201, 'Order split created successfully')
  } catch (error) {
    console.error('Create order split error:', error)
    return createErrorResponse('Failed to create order split', 500)
  }
})
