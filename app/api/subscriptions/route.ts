import { NextRequest } from 'next/server'

import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createSubscriptionSchema } from '@/app/lib/validations'

// GET /api/subscriptions
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const merchantId = searchParams.get('merchantId')

    const where: any = {}

    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      where.merchantId = user.merchantId
    } else if (merchantId) {
      where.merchantId = merchantId
    }

    if (status) where.status = status

    const skip = (page - 1) * limit

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              businessEmail: true
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
          },
          billingRecords: {
            where: { status: 'PENDING' },
            select: {
              id: true,
              billingType: true,
              description: true,
              amount: true,
              dueDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.subscription.count({ where })
    ])

    return createResponse({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Subscriptions retrieved successfully')
  } catch (error) {
    console.error('Get subscriptions error:', error)
    return createErrorResponse('Failed to retrieve subscriptions', 500)
  }
})

// POST /api/subscriptions
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const subscriptionData = createSubscriptionSchema.parse(body)

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: subscriptionData.merchantId },
      select: { id: true, businessName: true, onboardingStatus: true }
    })

    if (!merchant) {
      return createErrorResponse('Merchant not found', 404)
    }

    if (merchant.onboardingStatus !== 'APPROVED') {
      return createErrorResponse('Merchant must be approved before creating subscription', 400)
    }

    // Check if service plan exists
    const servicePlan = await prisma.servicePlan.findUnique({
      where: { id: subscriptionData.servicePlanId },
      select: { id: true, name: true, basePrice: true, isActive: true }
    })

    if (!servicePlan || !servicePlan.isActive) {
      return createErrorResponse('Service plan not found or inactive', 404)
    }

    // Check if merchant already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        merchantId: subscriptionData.merchantId,
        status: 'ACTIVE'
      }
    })

    if (existingSubscription) {
      return createErrorResponse('Merchant already has an active subscription', 400)
    }

    // Calculate total amount
    let totalAmount = Number(servicePlan.basePrice)

    // Add addon costs
    for (const addon of subscriptionData.addons) {
      const addonService = await prisma.addonService.findUnique({
        where: { id: addon.addonServiceId },
        select: { id: true, name: true, price: true, pricingType: true, isActive: true }
      })

      if (!addonService || !addonService.isActive) {
        return createErrorResponse(`Addon service ${addon.addonServiceId} not found or inactive`, 404)
      }

      totalAmount += Number(addonService.price) * addon.quantity
    }

    // Calculate next billing date
    const startDate = new Date(subscriptionData.startDate)
    const nextBillingDate = new Date(startDate)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // Prepare addon data
    const addonData = await Promise.all(
      subscriptionData.addons.map(async (addon) => {
        const addonService = await prisma.addonService.findUnique({
          where: { id: addon.addonServiceId },
          select: { price: true }
        })
        return {
          addonServiceId: addon.addonServiceId,
          quantity: addon.quantity,
          price: addon.quantity * Number(addonService?.price || 0),
          startDate
        }
      })
    )

    // Create subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        merchantId: subscriptionData.merchantId,
        servicePlanId: subscriptionData.servicePlanId,
        startDate,
        endDate: subscriptionData.endDate ? new Date(subscriptionData.endDate) : null,
        nextBillingDate,
        totalAmount,
        addons: {
          create: addonData
        }
      },
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

    // Create initial billing record
    await prisma.billingRecord.create({
      data: {
        merchantId: subscriptionData.merchantId,
        subscriptionId: newSubscription.id,
        billingType: 'SUBSCRIPTION',
        description: `Subscription for ${servicePlan.name}`,
        amount: totalAmount,
        dueDate: nextBillingDate
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_SUBSCRIPTION',
        entityType: 'subscriptions',
        entityId: newSubscription.id,
        newValues: subscriptionData
      }
    })

    return createResponse(newSubscription, 201, 'Subscription created successfully')
  } catch (error) {
    console.error('Create subscription error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create subscription', 500)
  }
})
