import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
})

// GET /api/webhooks/[id] - Get specific webhook
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: webhookId } = await params

    const where: any = { id: webhookId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    const webhook = await prisma.webhook.findFirst({
      where,
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggered: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
        webhookLogs: {
          select: {
            id: true,
            event: true,
            statusCode: true,
            response: true,
            error: true,
            attempts: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!webhook) {
      return createErrorResponse('Webhook not found', 404)
    }

    return createResponse(webhook, 200, 'Webhook retrieved successfully')
  } catch (error) {
    console.error('Get webhook error:', error)
    return createErrorResponse('Failed to retrieve webhook', 500)
  }
})

// PUT /api/webhooks/[id] - Update webhook
export const PUT = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: webhookId } = await params

    const body = await request.json()
    const validatedData = updateWebhookSchema.parse(body)

    const where: any = { id: webhookId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    // Check if webhook exists and belongs to merchant
    const existingWebhook = await prisma.webhook.findFirst({
      where
    })

    if (!existingWebhook) {
      return createErrorResponse('Webhook not found', 404)
    }

    // Update webhook
    const updatedWebhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        updatedAt: true
      }
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_WEBHOOK',
        entityType: 'webhooks',
        entityId: webhookId,
        oldValues: {
          name: existingWebhook.name,
          url: existingWebhook.url,
          events: existingWebhook.events,
          isActive: existingWebhook.isActive
        },
        newValues: validatedData
      }
    })

    return createResponse(updatedWebhook, 200, 'Webhook updated successfully')
  } catch (error) {
    console.error('Update webhook error:', error)
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update webhook', 500)
  }
})

// DELETE /api/webhooks/[id] - Delete webhook
export const DELETE = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: webhookId } = await params

    const where: any = { id: webhookId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    // Check if webhook exists and belongs to merchant
    const existingWebhook = await prisma.webhook.findFirst({
      where
    })

    if (!existingWebhook) {
      return createErrorResponse('Webhook not found', 404)
    }

    // Hard delete - remove from database
    await prisma.webhook.delete({
      where: { id: webhookId }
    })

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_WEBHOOK',
        entityType: 'webhooks',
        entityId: webhookId,
        oldValues: {
          name: existingWebhook.name,
          url: existingWebhook.url
        }
      }
    })

    return createResponse({ id: webhookId }, 200, 'Webhook deleted successfully')
  } catch (error) {
    console.error('Delete webhook error:', error)
    return createErrorResponse('Failed to delete webhook', 500)
  }
})
