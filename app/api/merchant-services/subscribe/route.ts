import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'
import { ensureDefaultServices, ensureMerchantDefaultSubscription } from '@/app/lib/services-utils'

const subscribeToServicesSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  services: z.array(z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    priceAtSelection: z.number().positive('Price must be positive')
  }))
})

// POST /api/merchant-services/subscribe
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    console.log('Service subscription request:', { merchantId: body.merchantId, serviceCount: body.services?.length })
    
    const { merchantId, services } = subscribeToServicesSchema.parse(body)

    // Verify merchant ownership
    if (user.merchantId !== merchantId) {
      return createErrorResponse('Forbidden: You can only subscribe to services for your own merchant account.', 403)
    }

    // Verify merchant exists and is approved
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, businessName: true, onboardingStatus: true }
    })

    if (!merchant) {
      return createErrorResponse('Merchant not found', 404)
    }

    if (merchant.onboardingStatus !== 'APPROVED') {
      return createErrorResponse('Merchant must be approved before subscribing to services', 400)
    }

    // Verify all services exist and are active
    const serviceIds = services.map(s => s.serviceId)
    const existingServices = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      },
      select: { id: true, name: true, price: true }
    })

    if (existingServices.length !== serviceIds.length) {
      return createErrorResponse('One or more services not found or inactive', 404)
    }

    console.log('Creating subscriptions for services:', serviceIds)

    // Create service subscriptions
    const serviceSubscriptions = await prisma.$transaction(async (tx) => {
      // First, remove any existing service subscriptions for this merchant
      await tx.merchantServiceSubscription.deleteMany({
        where: { merchantId }
      })

      // Create new service subscriptions using createMany for better performance
      const subscriptionData = services.map(service => ({
        merchantId,
        serviceId: service.serviceId,
        quantity: service.quantity,
        priceAtSubscription: service.priceAtSelection,
        status: 'ACTIVE' as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }))

      // Use createMany for better performance
      await tx.merchantServiceSubscription.createMany({
        data: subscriptionData
      })

      // Fetch the created subscriptions with service details
      const subscriptions = await tx.merchantServiceSubscription.findMany({
        where: { merchantId },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return subscriptions
    }, {
      timeout: 10000, // Increase timeout to 10 seconds
      maxWait: 5000, // Maximum time to wait for transaction to start
    })

    console.log('Successfully created subscriptions:', serviceSubscriptions.length)

    // Log the subscription
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'SUBSCRIBE_TO_SERVICES',
        entityType: 'merchant_service_subscriptions',
        entityId: merchantId,
        newValues: {
          services: serviceSubscriptions.map(sub => ({
            serviceId: sub.serviceId,
            serviceName: sub.service.name,
            quantity: sub.quantity,
            price: sub.priceAtSubscription
          }))
        }
      }
    })

    return createResponse({
      subscriptions: serviceSubscriptions,
      message: 'Successfully subscribed to selected services'
    }, 201, 'Service subscriptions created successfully')
  } catch (error) {
    console.error('Subscribe to services error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to subscribe to services', 500)
  }
})

// GET /api/merchant-services/subscribe
export const GET = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    // Ensure merchant has default subscriptions
    await ensureMerchantDefaultSubscription(user.merchantId)

    const subscriptions = await prisma.merchantServiceSubscription.findMany({
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
            category: true,
            features: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createResponse(subscriptions, 200, 'Service subscriptions retrieved successfully')
  } catch (error) {
    console.error('Get service subscriptions error:', error)
    return createErrorResponse('Failed to retrieve service subscriptions', 500)
  }
})