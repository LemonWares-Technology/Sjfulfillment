import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateOrderStatusSchema } from '../../../lib/validations'
import { notificationService, NotificationTemplates } from '../../../lib/notification-service'
import { sendOrderStatusUpdateEmail, sendMerchantStatusUpdateEmail } from '../../../lib/email'

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
            businessName: true,
            businessEmail: true,
            address: true,
            businessPhone: true
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
      });
      // After marking as DELIVERED, create DAILY_SERVICE_FEE billing record for merchant
      const merchant = await prisma.merchant.findUnique({
        where: { id: existingOrder.merchantId },
        select: { id: true }
      });
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          merchantId: existingOrder.merchantId,
          status: 'ACTIVE'
        },
        select: { id: true, servicePlan: { select: { basePrice: true } } }
      });
      if (merchant && activeSubscription) {
        await prisma.billingRecord.create({
          data: {
            merchantId: merchant.id,
            subscriptionId: activeSubscription.id,
            billingType: 'DAILY_SERVICE_FEE',
            description: `Daily service fee for delivered order ${existingOrder.orderNumber}`,
            amount: activeSubscription.servicePlan.basePrice,
            dueDate: new Date(),
            status: 'PENDING',
            referenceNumber: existingOrder.orderNumber
          }
        });
      }
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
    });

    // Send notifications based on status change
    try {
      // Get merchant admin user for this specific merchant
      const merchantAdminUser = await prisma.user.findFirst({
        where: {
          merchantId: updatedOrder.merchantId,
          role: 'MERCHANT_ADMIN'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      })

      if (merchantAdminUser) {
        console.log('🔔 Creating notification for merchant admin:', merchantAdminUser.id)

        if (updateData.status === 'DELIVERED') {
          // Notify merchant about delivery
          await notificationService.createNotification({
            recipientId: merchantAdminUser.id,
            title: 'Order Delivered',
            message: `Order ${updatedOrder.orderNumber} for ${updatedOrder.customerName} has been delivered`,
            type: 'ORDER_DELIVERED',
            priority: 'MEDIUM',
            metadata: {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              merchantId: updatedOrder.merchantId,
              customerName: updatedOrder.customerName,
              deliveredAt: new Date().toISOString()
            }
          })
        } else if (updateData.status === 'CANCELLED') {
          // Notify merchant about cancellation
          await notificationService.createNotification({
            recipientId: merchantAdminUser.id,
            title: 'Order Cancelled',
            message: `Order ${updatedOrder.orderNumber} has been cancelled`,
            type: 'ORDER_CANCELLED',
            priority: 'HIGH',
            metadata: {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              merchantId: updatedOrder.merchantId,
              cancelledAt: new Date().toISOString()
            }
          })
        } else {
          // General order update notification
          await notificationService.createNotification({
            recipientId: merchantAdminUser.id,
            title: 'Order Status Updated',
            message: `Order ${updatedOrder.orderNumber} status updated to ${updateData.status.replace(/_/g, ' ')}`,
            type: 'ORDER_UPDATED',
            priority: 'MEDIUM',
            metadata: {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              merchantId: updatedOrder.merchantId,
              newStatus: updateData.status,
              updatedAt: new Date().toISOString()
            }
          })
        }

        console.log('✅ Platform notification created for merchant admin')
      } else {
        console.log('⚠️ No merchant admin user found for notification')
      }
    } catch (notificationError) {
      console.error('❌ Error sending order status update notifications:', notificationError)
      if (notificationError instanceof Error) {
        console.error('Error details:', notificationError.message)
      }
      // Don't fail the order update if notifications fail
    }

    // Send status update email to customer
    try {
      // Only send email if customer email exists
      if (updatedOrder.customerEmail) {
        console.log('Attempting to send order status update email to customer...', {
          to: updatedOrder.customerEmail,
          orderNumber: updatedOrder.orderNumber,
          newStatus: updateData.status,
          trackingNumber: updateData.trackingNumber
        })

        await sendOrderStatusUpdateEmail({
          to: updatedOrder.customerEmail,
          customerName: updatedOrder.customerName,
          orderNumber: updatedOrder.orderNumber,
          newStatus: updateData.status,
          merchantBusinessName: updatedOrder.merchant.businessName,
          merchantAddress: updatedOrder.merchant.address || undefined,
          merchantPhone: updatedOrder.merchant.businessPhone || undefined,
          merchantEmail: updatedOrder.merchant.businessEmail || undefined,
          trackingNumber: updateData.trackingNumber,
          notes: updateData.notes,
          updatedAt: new Date(),
          orderId: updatedOrder.id
        })

        console.log('✅ Order status update email sent successfully to customer:', updatedOrder.customerEmail)
      } else {
        console.log('⚠️ Skipping customer status update email: No customer email for order', updatedOrder.orderNumber)
      }
    } catch (emailError) {
      console.error('❌ Error sending order status update email to customer:', emailError)
      // Log more details about the error
      if (emailError instanceof Error) {
        console.error('Error name:', emailError.name)
        console.error('Error message:', emailError.message)
        console.error('Error stack:', emailError.stack)
      }
      // Don't fail the order update if email sending fails
    }

    // Send status update email to merchant
    try {
      if (updatedOrder.merchant.businessEmail) {
        // Get merchant user name
        const merchantUser = await prisma.user.findFirst({
          where: {
            merchantId: updatedOrder.merchantId,
            role: 'MERCHANT_ADMIN'
          },
          select: {
            firstName: true,
            lastName: true
          }
        })

        const merchantName = merchantUser 
          ? `${merchantUser.firstName} ${merchantUser.lastName}`
          : updatedOrder.merchant.businessName

        console.log('Attempting to send order status update email to merchant...', {
          to: updatedOrder.merchant.businessEmail,
          orderNumber: updatedOrder.orderNumber,
          newStatus: updateData.status
        })

        await sendMerchantStatusUpdateEmail({
          to: updatedOrder.merchant.businessEmail,
          merchantName,
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          newStatus: updateData.status,
          trackingNumber: updateData.trackingNumber,
          notes: updateData.notes,
          updatedAt: new Date(),
          orderId: updatedOrder.id
        })

        console.log('✅ Order status update email sent successfully to merchant:', updatedOrder.merchant.businessEmail)
      } else {
        console.log('⚠️ Skipping merchant status update email: No merchant email for order', updatedOrder.orderNumber)
      }
    } catch (emailError) {
      console.error('❌ Error sending order status update email to merchant:', emailError)
      if (emailError instanceof Error) {
        console.error('Error name:', emailError.name)
        console.error('Error message:', emailError.message)
        console.error('Error stack:', emailError.stack)
      }
      // Don't fail the order update if email sending fails
    }

    return createResponse(updatedOrder, 200, 'Order updated successfully')
  } catch (error) {
    console.error('Update order error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update order', 500)
  }
  // Ensure a NextResponse is always returned
  return createErrorResponse('Unknown error', 500)
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
