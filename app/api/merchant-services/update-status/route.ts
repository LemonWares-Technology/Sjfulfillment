import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/merchant-services/update-status
export const GET = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { lastPlanUpdate: true }
    })

    if (!merchant?.lastPlanUpdate) {
      return createResponse({
        canUpdate: true,
        lastUpdate: null,
        nextUpdateAvailable: null,
        hoursRemaining: 0
      }, 200, 'Plan update status retrieved successfully')
    }

    const now = new Date()
    const lastUpdate = new Date(merchant.lastPlanUpdate)
    const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    const canUpdate = hoursSinceLastUpdate >= 24
    const hoursRemaining = canUpdate ? 0 : Math.ceil(24 - hoursSinceLastUpdate)
    const nextUpdateAvailable = canUpdate ? null : new Date(lastUpdate.getTime() + 24 * 60 * 60 * 1000)

    return createResponse({
      canUpdate,
      lastUpdate: merchant.lastPlanUpdate,
      nextUpdateAvailable,
      hoursRemaining
    }, 200, 'Plan update status retrieved successfully')
  } catch (error) {
    console.error('Get plan update status error:', error)
    return createErrorResponse('Failed to retrieve plan update status', 500)
  }
})

