import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { checkMerchantPaymentStatus } from '@/app/lib/payment-status'

// GET /api/merchants/payment-status
export const GET = withRole(['MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    if (!user.merchantId) {
      return createErrorResponse('Merchant ID not found', 400)
    }

    const paymentStatus = await checkMerchantPaymentStatus(user.merchantId)

    return createResponse(paymentStatus, 200, 'Payment status retrieved successfully')
  } catch (error) {
    console.error('Get payment status error:', error)
    return createErrorResponse('Failed to retrieve payment status', 500)
  }
})
