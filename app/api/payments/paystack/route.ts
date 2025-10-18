import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const initializePaymentSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default('NGN'),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// POST /api/payments/paystack/initialize
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const paymentData = initializePaymentSchema.parse(body)

    // Generate reference if not provided
    const reference = paymentData.reference || `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get merchant details
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { businessName: true, businessEmail: true }
    })

    if (!merchant) {
      return createErrorResponse('Merchant not found', 404)
    }

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: paymentData.email,
        amount: paymentData.amount * 100, // Convert to kobo
        currency: paymentData.currency,
        reference,
        metadata: {
          merchantId: user.merchantId,
          merchantName: merchant.businessName,
          ...paymentData.metadata
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-callback`
      })
    })

    if (!paystackResponse.ok) {
      const error = await paystackResponse.json()
      return createErrorResponse(error.message || 'Failed to initialize payment', 400)
    }

    const paystackData = await paystackResponse.json()

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        merchantId: user.merchantId,
        subscriptionId: paymentData.metadata?.subscriptionId,
        amount: paymentData.amount,
        paymentMethod: 'CARD',
        paymentReference: reference,
        paymentProvider: 'PAYSTACK',
        transactionId: paystackData.data.access_code,
        status: 'PENDING',
        processedAt: new Date()
      }
    })

    return createResponse({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference
    }, 200, 'Payment initialized successfully')
  } catch (error) {
    console.error('Initialize Paystack payment error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid payment data', 400)
    }
    return createErrorResponse('Failed to initialize payment', 500)
  }
})

// GET /api/payments/paystack/verify
export const GET = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return createErrorResponse('Payment reference is required', 400)
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      }
    })

    if (!paystackResponse.ok) {
      return createErrorResponse('Failed to verify payment', 400)
    }

    const paystackData = await paystackResponse.json()

    if (paystackData.status && paystackData.data.status === 'success') {
      // Update payment record
      const payment = await prisma.payment.findFirst({
        where: {
          paymentReference: reference,
          merchantId: user.merchantId
        }
      })

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            processedAt: new Date()
          }
        })

        // Update subscription status if this is a subscription payment
        if (payment.subscriptionId) {
          await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: { status: 'ACTIVE' }
          })

          // Update billing record
          await prisma.billingRecord.updateMany({
            where: {
              subscriptionId: payment.subscriptionId,
              status: 'PENDING'
            },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              paymentId: payment.id
            }
          })
        } else {
          // If no subscription ID, create a default subscription for the merchant
          // This handles the case where payment was made without a specific subscription
          const existingSubscription = await prisma.subscription.findFirst({
            where: {
              merchantId: payment.merchantId,
              status: { in: ['PENDING_PAYMENT', 'INACTIVE'] }
            }
          })

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: { status: 'ACTIVE' }
            })
          }
        }
      }

      return createResponse({
        status: true,
        message: 'Payment verified successfully',
        data: paystackData.data
      }, 200, 'Payment verified successfully')
    } else {
      return createErrorResponse('Payment verification failed', 400)
    }
  } catch (error) {
    console.error('Verify Paystack payment error:', error)
    return createErrorResponse('Failed to verify payment', 500)
  }
})
