import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { generateApiKeyPair } from '@/app/lib/api-key-auth'

// POST /api/api-keys/[id]/regenerate - Regenerate API key
export const POST = withRole(['MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: apiKeyId } = await params

    if (!user.merchantId) {
      return createErrorResponse('Merchant ID is required', 400)
    }

    // Check if API key exists and belongs to merchant
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        merchantId: user.merchantId
      }
    })

    if (!existingApiKey) {
      return createErrorResponse('API key not found', 404)
    }

    // Generate new API key pair
    const { publicKey, secretKey } = generateApiKeyPair()

    // Update API key with new keys
    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        publicKey,
        secretKey,
        usageCount: 0, // Reset usage count
        lastUsed: null
      },
      select: {
        id: true,
        name: true,
        publicKey: true,
        secretKey: true,
        permissions: true,
        rateLimit: true,
        updatedAt: true
      }
    })

    // Log the regeneration
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'REGENERATE_API_KEY',
        entityType: 'api_keys',
        entityId: apiKeyId,
        oldValues: {
          publicKey: existingApiKey.publicKey
        },
        newValues: {
          publicKey: updatedApiKey.publicKey
        }
      }
    })

    return createResponse(updatedApiKey, 200, 'API key regenerated successfully')
  } catch (error) {
    console.error('Regenerate API key error:', error)
    return createErrorResponse('Failed to regenerate API key', 500)
  }
})
