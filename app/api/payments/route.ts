import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const processPaymentSchema = z.object({
  subscriptionId: z.string().min(1),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'WALLET']),
  paymentReference: z.string().min(1),
  amount: z.number().positive(),
  paymentProvider: z.string().optional(),
  transactionId: z.string().optional()
})

// POST /api/payments/process
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const paymentData = processPaymentSchema.parse(body)

    // Verify subscription exists and belongs to merchant
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: paymentData.subscriptionId,
        merchantId: user.merchantId
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            onboardingStatus: true
          }
        },
        servicePlan: {
          select: {
            id: true,
            name: true,
            basePrice: true
          }
        }
      }
    })

    if (!subscription) {
      return createErrorResponse('Subscription not found', 404)
    }

    if (subscription.status !== 'PENDING_PAYMENT') {
      return createErrorResponse('Subscription is not in pending payment status', 400)
    }

    // Verify payment amount matches subscription amount
    if (Number(paymentData.amount) !== Number(subscription.totalAmount)) {
      return createErrorResponse('Payment amount does not match subscription amount', 400)
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        merchantId: user.merchantId,
        subscriptionId: paymentData.subscriptionId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        paymentProvider: paymentData.paymentProvider,
        transactionId: paymentData.transactionId,
        status: 'PENDING',
        processedAt: new Date()
      }
    })

    // Update subscription status to ACTIVE
    await prisma.subscription.update({
      where: { id: paymentData.subscriptionId },
      data: { 
        status: 'ACTIVE',
        startDate: new Date()
      }
    })

    // Update billing record status
    await prisma.billingRecord.updateMany({
      where: {
        subscriptionId: paymentData.subscriptionId,
        status: 'PENDING'
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentId: payment.id
      }
    })

    // Update merchant onboarding status to APPROVED if it was PENDING
    if (subscription.merchant.onboardingStatus === 'PENDING') {
      await prisma.merchant.update({
        where: { id: user.merchantId },
        data: { onboardingStatus: 'APPROVED' }
      })
    }

    // Log the payment
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'PROCESS_PAYMENT',
        entityType: 'payments',
        entityId: payment.id,
        newValues: paymentData
      }
    })

    return createResponse({
      payment,
      subscription: {
        id: subscription.id,
        status: 'ACTIVE',
        startDate: new Date()
      },
      merchant: {
        onboardingStatus: 'APPROVED'
      }
    }, 200, 'Payment processed successfully. Subscription is now active.')
  } catch (error) {
    console.error('Process payment error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid payment data', 400)
    }
    return createErrorResponse('Failed to process payment', 500)
  }
})

// GET /api/payments
export const GET = withRole(['MERCHANT_ADMIN', 'SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
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

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
          subscription: {
            select: {
              id: true,
              servicePlan: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { processedAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ])

    return createResponse({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Payments retrieved successfully')
  } catch (error) {
    console.error('Get payments error:', error)
    return createErrorResponse('Failed to retrieve payments', 500)
  }
})
