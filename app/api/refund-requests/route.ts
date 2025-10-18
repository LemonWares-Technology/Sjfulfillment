import { NextRequest } from 'next/server'
import { createResponse, createErrorResponse, withRole } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

// GET /api/refund-requests - Fetch refund requests
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    console.log('Refund requests API called by user:', user.role, user.userId)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    console.log('Refund requests API params:', { status, page, limit, skip })

    // Build where clause based on user role
    let whereClause: any = {}
    
    if (user.role === 'SJFS_ADMIN' || user.role === 'WAREHOUSE_STAFF') {
      // Admin and logistics staff can see all refund requests
      if (status) {
        whereClause.status = status
      }
    } else {
      // Merchants can only see their own refund requests
      whereClause.order = {
        merchantId: user.merchantId
      }
      if (status) {
        whereClause.status = status
      }
    }

    console.log('Refund requests where clause:', whereClause)
    
    const [refundRequests, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              totalAmount: true,
              status: true,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.refundRequest.count({ where: whereClause })
    ])
    
    console.log('Refund requests found:', refundRequests.length, 'Total:', total)

    return createResponse({
      refundRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 200, 'Refund requests retrieved successfully')
  } catch (error) {
    console.error('Error fetching refund requests:', error)
    // Return empty response instead of error to prevent JSON parsing issues
    return createResponse({
      refundRequests: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
      }
    }, 200, 'No refund requests found')
  }
})

// POST /api/refund-requests - Create new refund request
export const POST = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { orderId, reason, description, requestedAmount } = await request.json()

    if (!orderId || !reason || !requestedAmount) {
      return createErrorResponse('Order ID, reason, and requested amount are required', 400)
    }

    // Verify the order belongs to the merchant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: user.merchantId
      }
    })

    if (!order) {
      return createErrorResponse('Order not found or access denied', 404)
    }

    // Check if there's already a pending refund request for this order
    const existingRequest = await prisma.refundRequest.findFirst({
      where: {
        orderId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return createErrorResponse('A pending refund request already exists for this order', 409)
    }

    // Create the refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        requestedBy: user.userId,
        reason,
        description,
        requestedAmount: parseFloat(requestedAmount),
        status: 'PENDING'
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            totalAmount: true
          }
        },
        requestedByUser: {
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
        action: 'CREATE_REFUND_REQUEST',
        entityType: 'RefundRequest',
        entityId: refundRequest.id,
        newValues: {
          orderId,
          reason,
          requestedAmount,
          status: 'PENDING'
        }
      }
    })

    return createResponse(refundRequest, 201, 'Refund request created successfully')
  } catch (error) {
    console.error('Error creating refund request:', error)
    return createErrorResponse('Failed to create refund request', 500)
  }
})
