import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { generateToken } from '@/app/lib/auth'
import * as speakeasy from 'speakeasy'
import jwt from 'jsonwebtoken'

// POST /api/auth/2fa/verify-login
export const POST = async (request: NextRequest) => {
  try {
    const { tempToken, code, isBackupCode } = await request.json()

    if (!tempToken || !code) {
      return createErrorResponse('Temporary token and code are required', 400)
    }

    // Verify and decode the temporary token
    let tempPayload: any
    try {
      tempPayload = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key')
    } catch (error) {
      return createErrorResponse('Invalid or expired temporary token', 400)
    }

    if (tempPayload.type !== 'temp_2fa') {
      return createErrorResponse('Invalid token type', 400)
    }

    // Get user with 2FA details
    const user = await prisma.user.findUnique({
      where: { id: tempPayload.userId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    if (!user || !user.twoFactorEnabled) {
      return createErrorResponse('2FA not enabled for this user', 400)
    }

    let verified = false

    if (isBackupCode) {
      // Verify backup code
      const backupCodes = user.backupCodes || []
      const codeIndex = backupCodes.indexOf(code.toUpperCase())
      
      if (codeIndex === -1) {
        return createErrorResponse('Invalid backup code', 400)
      }

      // Remove used backup code
      const updatedBackupCodes = backupCodes.filter((_, index) => index !== codeIndex)
      await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: updatedBackupCodes }
      })

      verified = true
    } else {
      // Verify TOTP code
      if (!user.twoFactorSecret) {
        return createErrorResponse('2FA secret not found', 400)
      }

      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow some time drift
      })
    }

    if (!verified) {
      return createErrorResponse('Invalid verification code', 400)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Generate actual auth token
    const authToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId || undefined
    })

    return createResponse({
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        merchantId: user.merchantId,
        merchant: user.merchant
      }
    }, 200, '2FA verification successful')

  } catch (error) {
    console.error('2FA login verification error:', error)
    return createErrorResponse('Failed to verify 2FA code', 500)
  }
}
