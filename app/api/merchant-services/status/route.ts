import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

// GET /api/merchant-services/status
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    // For SJFS_ADMIN, return empty subscriptions - they have access via role, not subscriptions
    if (user.role === 'SJFS_ADMIN') {
      return createResponse({
        hasServices: true,
        serviceCount: 0,
        subscriptions: []
      }, 200, 'Admin has access to all services via role')
    }

    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    // Check if merchant has any active service subscriptions
    const serviceSubscriptions = await prisma.merchantServiceSubscription.findMany({
      where: {
        merchantId: user.merchantId,
        status: 'ACTIVE'
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true
          }
        }
      }
    })

    const hasServices = serviceSubscriptions.length > 0

    return createResponse({
      hasServices,
      serviceCount: serviceSubscriptions.length,
      subscriptions: serviceSubscriptions.map(sub => ({
        id: sub.id,
        service: {
          name: sub.service.name,
          description: sub.service.description
        },
        isActive: sub.status === 'ACTIVE'
      }))
    }, 200, 'Service status retrieved successfully')

  } catch (error) {
    console.error('Get service status error:', error)
    return createErrorResponse('Failed to retrieve service status', 500)
  }
})

