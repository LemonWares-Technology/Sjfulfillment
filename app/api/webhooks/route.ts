import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  url: z.string().url('Invalid URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  isActive: z.boolean().optional().default(true)
})

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
})

// GET /api/webhooks - List webhooks for merchant
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const isActive = searchParams.get('isActive')
    const merchantId = searchParams.get('merchantId')

    const where: any = {}

    // Filter by merchant if not admin or if specific merchant requested
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    } else if (merchantId) {
      where.merchantId = merchantId
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const skip = (page - 1) * limit

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        skip,
        take: limit,
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
          merchant: user.role === 'SJFS_ADMIN' ? {
            select: {
              id: true,
              businessName: true
            }
          } : false
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.webhook.count({ where })
    ])

    return createResponse({
      webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Webhooks retrieved successfully')
  } catch (error) {
    console.error('Get webhooks error:', error)
    return createErrorResponse('Failed to retrieve webhooks', 500)
  }
})

// POST /api/webhooks - Create new webhook
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const validatedData = createWebhookSchema.parse(body)

    // Determine target merchant ID
    let targetMerchantId = user.merchantId
    if (user.role === 'SJFS_ADMIN' && body.merchantId) {
      targetMerchantId = body.merchantId
    }

    if (!targetMerchantId) {
      return createErrorResponse('Merchant ID is required', 400)
    }

    // Check if merchant has API service subscription
    const hasApiService = await prisma.merchantServiceSubscription.findFirst({
      where: {
        merchantId: targetMerchantId,
        status: 'ACTIVE',
        service: {
          name: 'API Access'
        }
      }
    })

    if (!hasApiService) {
      return createErrorResponse('API Access service subscription required', 403)
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex')

    // Create webhook
    const newWebhook = await prisma.webhook.create({
      data: {
        merchantId: targetMerchantId,
        name: validatedData.name,
        url: validatedData.url,
        events: validatedData.events,
        secret,
        isActive: validatedData.isActive
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        secret: true,
        isActive: true,
        createdAt: true
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_WEBHOOK',
        entityType: 'webhooks',
        entityId: newWebhook.id,
        newValues: {
          name: newWebhook.name,
          url: newWebhook.url,
          events: newWebhook.events
        }
      }
    })

    return createResponse({
      webhook: {
        secret: newWebhook.secret
      }
    }, 201, 'Webhook created successfully')
  } catch (error) {
    console.error('Create webhook error:', error)
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create webhook', 500)
  }
})
