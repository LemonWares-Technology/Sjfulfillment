import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
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
  }).optional(),
  isActive: z.boolean().optional(),
  rateLimit: z.number().min(1).max(10000).optional()
})

// GET /api/api-keys/[id] - Get specific API key
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: apiKeyId } = await params

    const where: any = { id: apiKeyId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    const apiKey = await prisma.apiKey.findFirst({
      where,
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
        apiLogs: {
          select: {
            id: true,
            endpoint: true,
            method: true,
            statusCode: true,
            responseTime: true,
            createdAt: true,
            error: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!apiKey) {
      return createErrorResponse('API key not found', 404)
    }

    return createResponse(apiKey, 200, 'API key retrieved successfully')
  } catch (error) {
    console.error('Get API key error:', error)
    return createErrorResponse('Failed to retrieve API key', 500)
  }
})

// PUT /api/api-keys/[id] - Update API key
export const PUT = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: apiKeyId } = await params

    const body = await request.json()
    const validatedData = updateApiKeySchema.parse(body)

    const where: any = { id: apiKeyId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    // Check if API key exists and belongs to merchant
    const existingApiKey = await prisma.apiKey.findFirst({
      where
    })

    if (!existingApiKey) {
      return createErrorResponse('API key not found', 404)
    }

    // Update API key
    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        publicKey: true,
        permissions: true,
        isActive: true,
        rateLimit: true,
        updatedAt: true
      }
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_API_KEY',
        entityType: 'api_keys',
        entityId: apiKeyId,
        oldValues: {
          name: existingApiKey.name,
          permissions: existingApiKey.permissions,
          isActive: existingApiKey.isActive,
          rateLimit: existingApiKey.rateLimit
        },
        newValues: validatedData
      }
    })

    return createResponse(updatedApiKey, 200, 'API key updated successfully')
  } catch (error) {
    console.error('Update API key error:', error)
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update API key', 500)
  }
})

// DELETE /api/api-keys/[id] - Delete API key
export const DELETE = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: apiKeyId } = await params

    const where: any = { id: apiKeyId }
    
    // Filter by merchant if not admin
    if (user.role !== 'SJFS_ADMIN') {
      if (!user.merchantId) {
        return createErrorResponse('Merchant ID is required', 400)
      }
      where.merchantId = user.merchantId
    }

    // Check if API key exists and belongs to merchant
    const existingApiKey = await prisma.apiKey.findFirst({
      where
    })

    if (!existingApiKey) {
      return createErrorResponse('API key not found', 404)
    }

    // Hard delete - remove from database
    await prisma.apiKey.delete({
      where: { id: apiKeyId }
    })

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_API_KEY',
        entityType: 'api_keys',
        entityId: apiKeyId,
        oldValues: {
          name: existingApiKey.name,
          publicKey: existingApiKey.publicKey
        }
      }
    })

    return createResponse({ id: apiKeyId }, 200, 'API key deleted successfully')
  } catch (error) {
    console.error('Delete API key error:', error)
    return createErrorResponse('Failed to delete API key', 500)
  }
})
