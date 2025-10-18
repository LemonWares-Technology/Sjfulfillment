import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// POST /api/merchant-services/update-plan
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    // Check if merchant can update plan (24-hour restriction)
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { lastPlanUpdate: true }
    })

    if (merchant?.lastPlanUpdate) {
      const now = new Date()
      const lastUpdate = new Date(merchant.lastPlanUpdate)
      const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastUpdate < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastUpdate)
        return createErrorResponse(
          `You can only update your plan once every 24 hours. Please wait ${hoursRemaining} more hour(s).`,
          429
        )
      }
    }

    const body = await request.json()
    const { servicesToUpdate, servicesToRemove } = body

    if (!Array.isArray(servicesToUpdate) || !Array.isArray(servicesToRemove)) {
      return createErrorResponse('Invalid request format', 400)
    }

    // Pre-fetch services to avoid multiple queries in transaction
    const serviceIds = servicesToUpdate.map(s => s.serviceId)
    const services = await prisma.service.findMany({
      where: { 
        id: { in: serviceIds },
        isActive: true 
      }
    })

    // Validate all services exist
    const foundServiceIds = services.map(s => s.id)
    const missingServices = serviceIds.filter(id => !foundServiceIds.includes(id))
    if (missingServices.length > 0) {
      return createErrorResponse(`Services not found or inactive: ${missingServices.join(', ')}`, 400)
    }

    // Start a transaction with increased timeout
    const result = await prisma.$transaction(async (tx) => {
      const updates = []

      // 1. Remove services that are no longer needed
      if (servicesToRemove.length > 0) {
        const removeResult = await tx.merchantServiceSubscription.updateMany({
          where: {
            merchantId: user.merchantId,
            serviceId: { in: servicesToRemove },
            status: 'ACTIVE'
          },
          data: {
            status: 'CANCELLED',
            endDate: new Date()
          }
        })
        updates.push(`Removed ${removeResult.count} services`)
      }

      // 2. Update or add services
      for (const serviceUpdate of servicesToUpdate) {
        const { serviceId, quantity } = serviceUpdate
        const service = services.find(s => s.id === serviceId)

        // Check if merchant already has this service
        const existingSubscription = await tx.merchantServiceSubscription.findFirst({
          where: {
            merchantId: user.merchantId,
            serviceId: serviceId,
            status: 'ACTIVE'
          }
        })

        if (existingSubscription) {
          // Update existing subscription
          if (existingSubscription.quantity !== quantity) {
            await tx.merchantServiceSubscription.update({
              where: { id: existingSubscription.id },
              data: {
                quantity: quantity,
                priceAtSubscription: service.price // Update to current price
              }
            })
            updates.push(`Updated ${service.name} quantity to ${quantity}`)
          }
        } else {
          // Create new subscription
          await tx.merchantServiceSubscription.create({
            data: {
              merchantId: user.merchantId,
              serviceId: serviceId,
              quantity: quantity,
              priceAtSubscription: service.price,
              status: 'ACTIVE',
              startDate: new Date()
            }
          })
          updates.push(`Added ${service.name} (×${quantity})`)
        }
      }

      return updates
    }, {
      timeout: 10000 // Increase timeout to 10 seconds
    })

    // Update the merchant's lastPlanUpdate timestamp
    await prisma.merchant.update({
      where: { id: user.merchantId },
      data: { lastPlanUpdate: new Date() }
    })

    // Log the plan update
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'UPDATE_SERVICE_PLAN',
        entityType: 'merchant_service_subscriptions',
        entityId: user.merchantId,
        newValues: {
          servicesToUpdate,
          servicesToRemove,
          updates: result
        }
      }
    })

    return createResponse(
      { 
        message: 'Plan updated successfully',
        updates: result
      },
      200,
      'Merchant service plan updated successfully'
    )
  } catch (error) {
    console.error('Update plan error:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(error.message, 400)
    }
    return createErrorResponse('Failed to update plan', 500)
  }
})
