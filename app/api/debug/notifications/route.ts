import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/debug/notifications - Debug notifications (Admin only)
export const GET = withRole(
  ['SJFS_ADMIN'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      // Get all notifications
      const allNotifications = await prisma.notification.findMany({
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          priority: true,
          recipientId: true,
          recipientRole: true,
          isGlobal: true,
          isRead: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })

      // Get count
      const totalCount = await prisma.notification.count()

      return NextResponse.json({
        totalCount,
        recentNotifications: allNotifications,
        message: 'Debug info retrieved successfully'
      })
    } catch (error) {
      console.error('Error fetching debug notifications:', error)
      return createErrorResponse('Failed to fetch debug notifications', 500)
    }
  }
)
