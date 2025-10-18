import { NextRequest } from 'next/server'
import { createResponse, createErrorResponse, withRole } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

// GET /api/refund-requests/[id] - Get specific refund request
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Refund request ID is required', 400)
    }

    const refundRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        ...(user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF' ? {
          order: {
            merchantId: user.merchantId
          }
        } : {})
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            merchant: {
              select: {
                businessName: true,
                businessEmail: true
              }
            }
          }
        },
        requestedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        processedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!refundRequest) {
      return createErrorResponse('Refund request not found', 404)
    }

    return createResponse(refundRequest, 200, 'Refund request retrieved successfully')
  } catch (error) {
    console.error('Error fetching refund request:', error)
    return createErrorResponse('Failed to fetch refund request', 500)
  }
})

// PUT /api/refund-requests/[id] - Update refund request (approve/reject)
export const PUT = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Refund request ID is required', 400)
    }
    const { status, approvedAmount, rejectionReason } = await request.json()

    if (!status || !['APPROVED', 'REJECTED', 'PROCESSED'].includes(status)) {
      return createErrorResponse('Valid status is required', 400)
    }

    if (status === 'APPROVED' && !approvedAmount) {
      return createErrorResponse('Approved amount is required when approving', 400)
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return createErrorResponse('Rejection reason is required when rejecting', 400)
    }

    // Get the current refund request
    const currentRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            orderNumber: true,
            merchantId: true
          }
        }
      }
    })

    if (!currentRequest) {
      return createErrorResponse('Refund request not found', 404)
    }

    if (currentRequest.status !== 'PENDING') {
      return createErrorResponse('Only pending refund requests can be updated', 400)
    }

    // Update the refund request
    const updatedRequest = await prisma.refundRequest.update({
      where: { id },
      data: {
        status,
        approvedAmount: status === 'APPROVED' ? parseFloat(approvedAmount) : null,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        processedBy: user.userId,
        processedAt: new Date()
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            totalAmount: true,
            merchant: {
              select: {
                businessName: true
              }
            }
          }
        },
        requestedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        processedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'UPDATE_REFUND_REQUEST',
        entityType: 'RefundRequest',
        entityId: id,
        oldValues: {
          status: currentRequest.status
        },
        newValues: {
          status,
          approvedAmount: status === 'APPROVED' ? approvedAmount : null,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          processedBy: user.userId,
          processedAt: new Date()
        }
      }
    })

    // Create notification for the merchant
    await prisma.notification.create({
      data: {
        userId: currentRequest.requestedBy,
        title: `Refund Request ${status.toLowerCase()}`,
        message: `Your refund request for order ${currentRequest.order.orderNumber} has been ${status.toLowerCase()}.`,
        type: 'REFUND_UPDATE',
        isRead: false
      }
    })

    return createResponse(updatedRequest, 200, `Refund request ${status.toLowerCase()} successfully`)
  } catch (error) {
    console.error('Error updating refund request:', error)
    return createErrorResponse('Failed to update refund request', 500)
  }
})

// DELETE /api/refund-requests/[id] - Cancel refund request (only by requester)
export const DELETE = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Refund request ID is required', 400)
    }

    // Get the current refund request
    const currentRequest = await prisma.refundRequest.findFirst({
      where: {
        id,
        requestedBy: user.userId,
        order: {
          merchantId: user.merchantId
        }
      }
    })

    if (!currentRequest) {
      return createErrorResponse('Refund request not found or access denied', 404)
    }

    if (currentRequest.status !== 'PENDING') {
      return createErrorResponse('Only pending refund requests can be cancelled', 400)
    }

    // Delete the refund request
    await prisma.refundRequest.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'DELETE_REFUND_REQUEST',
        entityType: 'RefundRequest',
        entityId: id,
        oldValues: {
          orderId: currentRequest.orderId,
          reason: currentRequest.reason,
          requestedAmount: currentRequest.requestedAmount,
          status: currentRequest.status
        }
      }
    })

    return createResponse({}, 200, 'Refund request cancelled successfully')
  } catch (error) {
    console.error('Error cancelling refund request:', error)
    return createErrorResponse('Failed to cancel refund request', 500)
  }
})
