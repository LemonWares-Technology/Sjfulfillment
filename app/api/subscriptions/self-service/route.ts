import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createSubscriptionSchema } from '@/app/lib/validations'

// POST /api/subscriptions/self-service
// Allow merchants to create their own subscriptions after approval
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const subscriptionData = {
      ...body,
      merchantId: user.merchantId // Force merchant ID from authenticated user
    }
    
    const validatedData = createSubscriptionSchema.parse(subscriptionData)

    // Check if merchant exists and is approved
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
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
      where: { id: validatedData.servicePlanId },
      select: { id: true, name: true, basePrice: true, isActive: true }
    })

    if (!servicePlan || !servicePlan.isActive) {
      return createErrorResponse('Service plan not found or inactive', 404)
    }

    // Check if merchant already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        merchantId: user.merchantId,
        status: 'ACTIVE'
      }
    })

    if (existingSubscription) {
      return createErrorResponse('Merchant already has an active subscription', 400)
    }

    // Calculate total amount
    let totalAmount = Number(servicePlan.basePrice)

    // Add addon costs
    for (const addon of validatedData.addons) {
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
    const startDate = new Date()
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // Create subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        merchantId: user.merchantId,
        servicePlanId: validatedData.servicePlanId,
        status: 'PENDING_PAYMENT', // Set to pending payment initially
        startDate,
        nextBillingDate,
        totalAmount,
        addons: {
          create: validatedData.addons.map(addon => ({
            addonServiceId: addon.addonServiceId,
            quantity: addon.quantity
          }))
        }
      },
      include: {
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
        merchantId: user.merchantId,
        subscriptionId: newSubscription.id,
        billingType: 'SUBSCRIPTION',
        description: `Subscription for ${servicePlan.name}`,
        amount: totalAmount,
        dueDate: nextBillingDate,
        status: 'PENDING'
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_SUBSCRIPTION_SELF_SERVICE',
        entityType: 'subscriptions',
        entityId: newSubscription.id,
        newValues: validatedData
      }
    })

    return createResponse(newSubscription, 201, 'Subscription created successfully. Please proceed to payment.')
  } catch (error) {
    console.error('Create self-service subscription error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create subscription', 500)
  }
})
