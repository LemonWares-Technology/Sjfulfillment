import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { generateApiKeyPair } from '@/app/lib/api-key-auth'
import { z } from 'zod'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  permissions: z.object({
    products: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional(),
      delete: z.boolean().optional()
    }).optional(),
    orders: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional(),
      delete: z.boolean().optional()
    }).optional(),
    inventory: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional()
    }).optional(),
    webhooks: z.object({
      read: z.boolean().optional(),
      write: z.boolean().optional()
    }).optional()
  }),
  rateLimit: z.number().min(1).max(10000).optional().default(1000)
})

// GET /api/api-keys - List API keys for merchant
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

    const [apiKeys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          publicKey: true,
          permissions: true,
          isActive: true,
          lastUsed: true,
          usageCount: true,
          rateLimit: true,
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
      prisma.apiKey.count({ where })
    ])

    return createResponse({
      apiKeys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'API keys retrieved successfully')
  } catch (error) {
    console.error('Get API keys error:', error)
    return createErrorResponse('Failed to retrieve API keys', 500)
  }
})

// POST /api/api-keys - Create new API key
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const validatedData = createApiKeySchema.parse(body)

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

    // Generate API key pair
    const { publicKey, secretKey } = generateApiKeyPair()

    // Create API key
    const newApiKey = await prisma.apiKey.create({
      data: {
        merchantId: targetMerchantId,
        name: validatedData.name,
        publicKey,
        secretKey,
        permissions: validatedData.permissions,
        rateLimit: validatedData.rateLimit
      },
      select: {
        id: true,
        name: true,
        publicKey: true,
        secretKey: true,
        permissions: true,
        rateLimit: true,
        createdAt: true
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_API_KEY',
        entityType: 'api_keys',
        entityId: newApiKey.id,
        newValues: {
          name: newApiKey.name,
          permissions: newApiKey.permissions,
          rateLimit: newApiKey.rateLimit
        }
      }
    })

    return createResponse({
      apiKey: {
        publicKey: newApiKey.publicKey,
        secretKey: newApiKey.secretKey
      }
    }, 201, 'API key created successfully')
  } catch (error) {
    console.error('Create API key error:', error)
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create API key', 500)
  }
})
