import { prisma } from './prisma'
import crypto from 'crypto'

export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  merchantId: string
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  merchantId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    // Find active webhooks for this merchant that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        merchantId,
        isActive: true,
        events: {
          has: event
        }
      }
    })

    if (webhooks.length === 0) {
      return
    }

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      merchantId
    }

    // Trigger each webhook
    const promises = webhooks.map(webhook => 
      sendWebhook(webhook, payload)
    )

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}

/**
 * Send webhook to a specific endpoint
 */
async function sendWebhook(webhook: any, payload: WebhookPayload): Promise<void> {
  try {
    const signature = generateSignature(JSON.stringify(payload), webhook.secret)
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'SJFulfillment-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    const success = response.ok
    const responseText = await response.text().catch(() => 'Failed to read response')

    // Log webhook attempt
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        statusCode: response.status,
        response: responseText,
        error: success ? null : `HTTP ${response.status}: ${responseText}`
      }
    })

    // Update webhook statistics
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggered: new Date(),
        successCount: { increment: success ? 1 : 0 },
        failureCount: { increment: success ? 0 : 1 }
      }
    })

    if (!success) {
      console.error(`Webhook failed for ${webhook.url}: ${response.status} ${responseText}`)
    }
  } catch (error) {
    console.error(`Error sending webhook to ${webhook.url}:`, error)
    
    // Log webhook failure
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        statusCode: null,
        response: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    // Update failure count
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggered: new Date(),
        failureCount: { increment: 1 }
      }
    })
  }
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Available webhook events
 */
export const WEBHOOK_EVENTS = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  
  // Inventory events
  INVENTORY_UPDATED: 'inventory.updated',
  LOW_STOCK_ALERT: 'inventory.low_stock',
  OUT_OF_STOCK: 'inventory.out_of_stock',
  
  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  
  // Return events
  RETURN_CREATED: 'return.created',
  RETURN_PROCESSED: 'return.processed'
} as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]
