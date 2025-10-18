import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withAuth } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import * as speakeasy from 'speakeasy'
import bcrypt from 'bcryptjs'

// POST /api/auth/2fa/disable
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return createErrorResponse('Token and password are required', 400)
    }

    // Get user with 2FA details
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })

    if (!existingUser?.twoFactorEnabled) {
      return createErrorResponse('2FA is not enabled', 400)
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, existingUser.password)
    if (!validPassword) {
      return createErrorResponse('Invalid password', 400)
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: existingUser.twoFactorSecret!,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return createErrorResponse('Invalid verification code', 400)
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: []
      }
    })

    return createResponse({}, 200, '2FA disabled successfully')

  } catch (error) {
    console.error('2FA disable error:', error)
    return createErrorResponse('Failed to disable 2FA', 500)
  }
})
