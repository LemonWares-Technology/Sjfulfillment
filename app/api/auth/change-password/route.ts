import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withAuth } from '@/app/lib/api-utils'
import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/auth/change-password
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return createErrorResponse('Current password and new password are required', 400)
    }

    if (newPassword.length < 8) {
      return createErrorResponse('New password must be at least 8 characters long', 400)
    }

    // Get user with current password
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, existingUser.password)
    if (!validPassword) {
      return createErrorResponse('Current password is incorrect', 400)
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        password: hashedNewPassword
      }
    })

    // Check if this is a logistics partner and notify SJF
    if (user.role === 'WAREHOUSE_STAFF') {
      // Find logistics partner associated with this user
      const logisticsPartner = await prisma.logisticsPartner.findFirst({
        where: { email: user.email }
      })

      if (logisticsPartner) {
        // Create notification for SJF admins
        await prisma.notification.create({
          data: {
            user: {
              connect: { id: user.userId }
            },
            type: 'PASSWORD_CHANGE',
            title: 'Logistics Partner Password Changed',
            message: `Logistics partner "${logisticsPartner.companyName}" (${user.email}) has changed their password.`,
            data: {
              partnerId: logisticsPartner.id,
              partnerName: logisticsPartner.companyName,
              userEmail: user.email,
              changeTime: new Date().toISOString(),
              userRole: user.role
            },
            isRead: false
          }
        })

        // Also log this in audit log
        await prisma.auditLog.create({
          data: {
            user: {
              connect: { id: user.userId }
            },
            action: 'PASSWORD_CHANGE',
            entityType: 'User',
            entityId: user.userId,
            details: {
              userEmail: user.email,
              userRole: user.role,
              partnerId: logisticsPartner.id,
              partnerName: logisticsPartner.companyName,
              changeTime: new Date().toISOString(),
              notificationSent: true
            }
          }
        })

        console.log(`🔔 NOTIFICATION: Logistics partner "${logisticsPartner.companyName}" changed their password`)
      }
    }

    return createResponse({}, 200, 'Password changed successfully')

  } catch (error) {
    console.error('Change password error:', error)
    return createErrorResponse('Failed to change password', 500)
  }
})
