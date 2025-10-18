import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withAuth } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import * as speakeasy from 'speakeasy'
import { randomBytes } from 'crypto'

// POST /api/auth/2fa/verify
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const { token, secret } = await request.json()

    if (!token || !secret) {
      return createErrorResponse('Token and secret are required', 400)
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow some time drift
    })

    if (!verified) {
      return createErrorResponse('Invalid verification code', 400)
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    )

    // Enable 2FA and save backup codes
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: backupCodes
      }
    })

    return createResponse({
      backupCodes
    }, 200, '2FA enabled successfully')

  } catch (error) {
    console.error('2FA verification error:', error)
    return createErrorResponse('Failed to verify 2FA', 500)
  }
})
