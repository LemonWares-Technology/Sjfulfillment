import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/billing/daily-charges - Get daily charges for a merchant
export const GET = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0] // Default to today

    // Get active service subscriptions for the merchant
    const subscriptions = await prisma.merchantServiceSubscription.findMany({
      where: {
        merchantId: user.merchantId,
        status: 'ACTIVE',
        startDate: { lte: new Date(date) },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(date) } }
        ]
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

    // Calculate daily charges
    const dailyCharges = subscriptions.map(subscription => ({
      serviceId: subscription.serviceId,
      serviceName: subscription.service.name,
      serviceDescription: subscription.service.description,
      serviceCategory: subscription.service.category,
      quantity: subscription.quantity,
      dailyPrice: subscription.priceAtSubscription,
      totalDailyCharge: Number(subscription.priceAtSubscription) * subscription.quantity
    }))

    const totalDailyCharge = dailyCharges.reduce((sum, charge) => sum + charge.totalDailyCharge, 0)

    // Get accumulated charges (all billing records regardless of type or status)
    const allBillingRecords = await prisma.billingRecord.findMany({
      where: {
        merchantId: user.merchantId
      },
      orderBy: { dueDate: 'desc' }
    })

    const accumulatedCharges = allBillingRecords.reduce((sum, record) => sum + Number(record.amount), 0)

    return createResponse({
      date,
      dailyCharges,
      totalDailyCharge,
      accumulatedCharges,
      subscriptions: subscriptions.length
    }, 200, 'Daily charges retrieved successfully')
  } catch (error) {
    console.error('Get daily charges error:', error)
    return createErrorResponse('Failed to retrieve daily charges', 500)
  }
})

// POST /api/billing/daily-charges - Create daily billing records
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const { date, merchantIds } = body

    if (!date) {
      return createErrorResponse('Date is required', 400)
    }

    const billingDate = new Date(date)
    const targetMerchants = merchantIds || [] // If empty, process all merchants

    // Get all active service subscriptions for the specified date
    const whereClause: any = {
      status: 'ACTIVE',
      startDate: { lte: billingDate },
      OR: [
        { endDate: null },
        { endDate: { gte: billingDate } }
      ]
    }

    if (targetMerchants.length > 0) {
      whereClause.merchantId = { in: targetMerchants }
    }

    const subscriptions = await prisma.merchantServiceSubscription.findMany({
      where: whereClause,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Group subscriptions by merchant
    const merchantSubscriptions = subscriptions.reduce((acc, sub) => {
      if (!acc[sub.merchantId]) {
        acc[sub.merchantId] = []
      }
      acc[sub.merchantId].push(sub)
      return acc
    }, {} as Record<string, typeof subscriptions>)

    // Create billing records for each merchant
    const billingRecords = []
    for (const [merchantId, merchantSubs] of Object.entries(merchantSubscriptions)) {
      const totalAmount = merchantSubs.reduce((sum, sub) => {
        return sum + (Number(sub.priceAtSubscription) * sub.quantity)
      }, 0)

      if (totalAmount > 0) {
        const billingRecord = await prisma.billingRecord.create({
          data: {
            merchantId,
            billingType: 'DAILY_SERVICE_FEE',
            description: `Daily service charges for ${billingDate.toISOString().split('T')[0]}`,
            amount: totalAmount,
            dueDate: billingDate,
            status: 'PENDING'
          }
        })

        billingRecords.push(billingRecord)
      }
    }

    return createResponse({
      billingRecords,
      processedMerchants: Object.keys(merchantSubscriptions).length,
      totalRecords: billingRecords.length
    }, 201, 'Daily billing records created successfully')
  } catch (error) {
    console.error('Create daily billing error:', error)
    return createErrorResponse('Failed to create daily billing records', 500)
  }
})

