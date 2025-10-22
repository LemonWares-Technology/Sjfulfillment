import { NextRequest } from 'next/server'
import { createResponse, createErrorResponse, withRole } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

// GET /api/returns/[id] - Get specific return request
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Return request ID is required', 400)
    }

    const returnRequest = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            merchantId: true,
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            createdAt: true,
            totalAmount: true,
            status: true,
            merchant: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
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

    if (!returnRequest) {
      return createErrorResponse('Return request not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF') {
      if (returnRequest.order.merchantId !== user.merchantId) {
        return createErrorResponse('Access denied', 403)
      }
    }

    return createResponse(returnRequest, 200, 'Return request retrieved successfully')
  } catch (error) {
    console.error('Error fetching return request:', error)
    return createErrorResponse('Failed to fetch return request', 500)
  }
})

// PUT /api/returns/[id] - Update return request (approve/reject)
export const PUT = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Return request ID is required', 400)
    }

    const body = await request.json()
    const { status, approvedAmount, rejectionReason } = body

    if (!status || !['APPROVED', 'REJECTED', 'PROCESSED'].includes(status)) {
      return createErrorResponse('Valid status is required', 400)
    }

    // Check if return request exists
    const returnRequest = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            merchantId: true
          }
        }
      }
    })

    if (!returnRequest) {
      return createErrorResponse('Return request not found', 404)
    }

    // Update the return request
    const updateData: any = {
      status,
      processedBy: user.userId,
      processedAt: new Date()
    }

    if (status === 'APPROVED' && approvedAmount) {
      updateData.approvedAmount = parseFloat(approvedAmount)
    }

    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    const updatedReturn = await prisma.return.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            merchantId: true,
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            createdAt: true,
            totalAmount: true,
            status: true,
            merchant: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
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
        action: 'UPDATE_RETURN_STATUS',
        entityType: 'returns',
        entityId: id,
        oldValues: { status: returnRequest.status },
        newValues: { status, approvedAmount, rejectionReason }
      }
    })

    // Create notification for requester on approval/rejection
    try {
      if (status === 'APPROVED' || status === 'REJECTED') {
        await prisma.notification.create({
          data: {
            recipientId: returnRequest.requestedBy || undefined,
            title: `Return ${status.toLowerCase()}`,
            message: `Your return request for order ${updatedReturn.order.orderNumber} has been ${status.toLowerCase()}.`,
            type: status === 'APPROVED' ? 'RETURN_APPROVED' : 'RETURN_REJECTED',
            isRead: false
          }
        })
      }
    } catch (notifyErr) {
      console.error('Failed to create return notification:', notifyErr)
      // Do not fail the main request if notification fails
    }

    return createResponse(updatedReturn, 200, 'Return request updated successfully')
  } catch (error) {
    console.error('Error updating return request:', error)
    return createErrorResponse('Failed to update return request', 500)
  }
})

// DELETE /api/returns/[id] - Cancel return request (only by requester)
export const DELETE = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload, context?: any) => {
  try {
    const { id } = context?.params || { id: '' }
    
    if (!id) {
      return createErrorResponse('Return request ID is required', 400)
    }

    // Check if return request exists and belongs to the user
    const returnRequest = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            merchantId: true
          }
        }
      }
    })

    if (!returnRequest) {
      return createErrorResponse('Return request not found', 404)
    }

    // Check if user can cancel this request
    if (returnRequest.requestedBy !== user.userId) {
      return createErrorResponse('You can only cancel your own return requests', 403)
    }

    // Only allow cancellation if status is PENDING
    if (returnRequest.status !== 'PENDING') {
      return createErrorResponse('Only pending return requests can be cancelled', 400)
    }

    // Delete the return request
    await prisma.return.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'CANCEL_RETURN_REQUEST',
        entityType: 'returns',
        entityId: id,
        oldValues: returnRequest
      }
    })

    return createResponse({}, 200, 'Return request cancelled successfully')
  } catch (error) {
    console.error('Error cancelling return request:', error)
    return createErrorResponse('Failed to cancel return request', 500)
  }
})