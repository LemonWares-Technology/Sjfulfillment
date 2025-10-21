import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { createErrorResponse } from './api-utils'

export interface ApiKeyPayload {
  apiKeyId: string
  merchantId: string
  permissions: any
  rateLimit: number
  usageCount: number
}

/**
 * Middleware to authenticate API requests using API keys
 */
export async function authenticateApiKey(request: NextRequest): Promise<{ success: true; payload: ApiKeyPayload } | { success: false; error: string; status: number }> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header. Use: Authorization: Bearer <api-key>',
        status: 401
      }
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { publicKey: apiKey },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            isActive: true,
            onboardingStatus: true
          }
        }
      }
    })

    if (!apiKeyRecord) {
      return {
        success: false,
        error: 'Invalid API key',
        status: 401
      }
    }

    // Check if API key is active
    if (!apiKeyRecord.isActive) {
      return {
        success: false,
        error: 'API key is deactivated',
        status: 401
      }
    }

    // Check if merchant is active and approved
    if (!apiKeyRecord.merchant.isActive || apiKeyRecord.merchant.onboardingStatus !== 'APPROVED') {
      return {
        success: false,
        error: 'Merchant account is not active or approved',
        status: 403
      }
    }

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentUsage = await prisma.apiLog.count({
      where: {
        apiKeyId: apiKeyRecord.id,
        createdAt: { gte: oneHourAgo }
      }
    })

    if (recentUsage >= apiKeyRecord.rateLimit) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        status: 429
      }
    }

    // Update usage count and last used
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date()
      }
    })

    return {
      success: true,
      payload: {
        apiKeyId: apiKeyRecord.id,
        merchantId: apiKeyRecord.merchantId,
        permissions: apiKeyRecord.permissions,
        rateLimit: apiKeyRecord.rateLimit,
        usageCount: apiKeyRecord.usageCount + 1
      }
    }
  } catch (error) {
    console.error('API key authentication error:', error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
}

/**
 * Middleware wrapper for API key authentication
 */
export function withApiKey(handler: (request: NextRequest, apiKey: ApiKeyPayload, context?: any) => Promise<Response>) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    const authResult = await authenticateApiKey(request)
    
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status)
    }

    return handler(request, authResult.payload, context)
  }
}

/**
 * Check if API key has specific permission
 */
export function hasApiPermission(permissions: any, requiredPermission: string): boolean {
  if (!permissions || typeof permissions !== 'object') {
    return false
  }

  // Check for exact permission
  if (permissions[requiredPermission] === true) {
    return true
  }

  // Check for wildcard permission
  if (permissions['*'] === true) {
    return true
  }

  // Check for resource-specific permissions (e.g., "products:read")
  const [resource, action] = requiredPermission.split(':')
  if (permissions[resource] && permissions[resource][action] === true) {
    return true
  }

  return false
}

/**
 * Log API request
 */
export async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime?: number,
  ipAddress?: string,
  userAgent?: string,
  requestBody?: any,
  responseBody?: any,
  error?: string
) {
  try {
    await prisma.apiLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        requestBody: requestBody ? JSON.stringify(requestBody) : undefined,
        responseBody: responseBody ? JSON.stringify(responseBody) : undefined,
        error
      }
    })
  } catch (error) {
    console.error('Failed to log API request:', error)
  }
}

/**
 * Generate API key pair
 */
export function generateApiKeyPair(): { publicKey: string; secretKey: string } {
  const publicKey = `pk_${generateRandomString(32)}`
  const secretKey = `sk_${generateRandomString(64)}`
  
  return { publicKey, secretKey }
}

/**
 * Generate random string for API keys
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}
