import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withAuth } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

// POST /api/auth/2fa/setup
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    // Check if 2FA is already enabled
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }

    if (existingUser.twoFactorEnabled) {
      return createErrorResponse('2FA is already enabled', 400)
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SJFulfillment (${user.email})`,
      issuer: 'SJFulfillment'
    })

    // Generate QR code
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: user.email,
      issuer: 'SJFulfillment'
    })

    const qrCode = await QRCode.toDataURL(qrCodeUrl)

    // Store temporary secret (will be confirmed when verified)
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        twoFactorSecret: secret.base32
      }
    })

    return createResponse({
      qrCode,
      secret: secret.base32
    }, 200, '2FA setup initiated')

  } catch (error) {
    console.error('2FA setup error:', error)
    return createErrorResponse('Failed to setup 2FA', 500)
  }
})
