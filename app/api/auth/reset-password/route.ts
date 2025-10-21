import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse } from '../../../lib/api-utils'
import { hashPassword } from '../../../lib/password'

// POST /api/auth/reset-password
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return createErrorResponse('Token and password are required', 400)
    }

    if (password.length < 6) {
      return createErrorResponse('Password must be at least 6 characters long', 400)
    }

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return createErrorResponse('Invalid or expired reset token', 400)
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ])

    // Check if this is a logistics partner and notify SJF
    if (resetToken.user.role === 'WAREHOUSE_STAFF') {
      // Find logistics partner associated with this user
      const logisticsPartner = await prisma.logisticsPartner.findFirst({
        where: { email: resetToken.user.email }
      })

      if (logisticsPartner) {
        // Create notification for SJF admins
        await prisma.notification.create({
          data: {
            recipientId: resetToken.userId,
            type: 'SYSTEM_ALERT',
            title: 'Logistics Partner Password Reset',
            message: `Logistics partner "${logisticsPartner.companyName}" (${resetToken.user.email}) has reset their password.`,
            metadata: {
              partnerId: logisticsPartner.id,
              partnerName: logisticsPartner.companyName,
              userEmail: resetToken.user.email,
              resetTime: new Date().toISOString(),
              userRole: resetToken.user.role
            },
            isRead: false
          }
        })

        // Also log this in audit log
        await prisma.auditLog.create({
          data: {
            userId: resetToken.userId,
            action: 'PASSWORD_RESET',
            entityType: 'User',
            entityId: resetToken.userId,
            newValues: {
              userEmail: resetToken.user.email,
              userRole: resetToken.user.role,
              partnerId: logisticsPartner.id,
              partnerName: logisticsPartner.companyName,
              resetTime: new Date().toISOString(),
              notificationSent: true
            }
          }
        })

        console.log(`🔔 NOTIFICATION: Logistics partner "${logisticsPartner.companyName}" reset their password`)
      }
    }

    return createResponse(
      { message: 'Password reset successfully' },
      200,
      'Password reset successful'
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return createErrorResponse('Failed to reset password', 500)
  }
}

