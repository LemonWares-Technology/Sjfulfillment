import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { triggerWebhooks } from '@/app/lib/webhook-service'

// POST /api/webhooks/[id]/test - Test webhook
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: webhookId } = await params

    if (!user.merchantId) {
      return createErrorResponse('Merchant ID is required', 400)
    }

    // Check if webhook exists and belongs to merchant
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        merchantId: user.merchantId
      }
    })

    if (!webhook) {
      return createErrorResponse('Webhook not found', 404)
    }

    // Send test webhook
    await triggerWebhooks(
      user.merchantId,
      'test.webhook',
      {
        message: 'This is a test webhook from SJFulfillment',
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    )

    return createResponse(
      { message: 'Test webhook sent successfully' },
      200,
      'Test webhook sent successfully'
    )
  } catch (error) {
    console.error('Test webhook error:', error)
    return createErrorResponse('Failed to send test webhook', 500)
  }
})
