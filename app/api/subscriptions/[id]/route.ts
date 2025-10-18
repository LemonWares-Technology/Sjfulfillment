import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateSubscriptionSchema } from '../../../lib/validations'

// GET /api/subscriptions/[id]
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: subscriptionId } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
            onboardingStatus: true
          }
        },
        servicePlan: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            features: true,
            isActive: true
          }
        },
        addons: {
          include: {
            addonService: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                pricingType: true,
                isActive: true
              }
            }
          }
        },
        billingRecords: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!subscription) {
      return createErrorResponse('Subscription not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && subscription.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    return createResponse(subscription, 200, 'Subscription retrieved successfully')
  } catch (error) {
    console.error('Get subscription error:', error)
    return createErrorResponse('Failed to retrieve subscription', 500)
  }
})

// PUT /api/subscriptions/[id]
export const PUT = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: subscriptionId } = await params
    const body = await request.json()
    const updateData = updateSubscriptionSchema.parse(body)

    // Check if subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, merchantId: true, status: true }
    })

    if (!existingSubscription) {
      return createErrorResponse('Subscription not found', 404)
    }

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        },
        servicePlan: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            features: true
          }
        },
        addons: {
          include: {
            addonService: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                pricingType: true
              }
            }
          }
        }
      }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_SUBSCRIPTION',
        entityType: 'subscriptions',
        entityId: subscriptionId,
        newValues: updateData
      }
    })

    return createResponse(updatedSubscription, 200, 'Subscription updated successfully')
  } catch (error) {
    console.error('Update subscription error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update subscription', 500)
  }
})



