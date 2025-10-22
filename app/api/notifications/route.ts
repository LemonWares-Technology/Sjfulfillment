import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { notificationService } from '@/app/lib/notification-service'

// GET /api/notifications - Get user notifications
export const GET = withRole(
  ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const unreadOnly = searchParams.get('unreadOnly') === 'true'

      console.log('🔔 GET /api/notifications called by:', {
        userId: user.userId,
        role: user.role,
        merchantId: user.merchantId,
        email: user.email
      })

  const notifications = await notificationService.getUserNotifications(user.userId, limit, offset)
  const unreadCount = await notificationService.getUnreadCount(user.userId)
  const total = await notificationService.getTotalCount(user.userId)

  console.log(`📬 Returning ${notifications.length} notifications (${unreadCount} unread) of total ${total}`)

      return NextResponse.json({
        success: true,
          data: {
            notifications,
            unreadCount,
            total
          }
      })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return createErrorResponse('Failed to fetch notifications', 500)
    }
  }
)

// POST /api/notifications - Create notification (Admin only)
export const POST = withRole(
  ['SJFS_ADMIN'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const body = await request.json()
      const { title, message, type, priority, recipientRole, isGlobal, metadata } = body

      if (!title || !message || !type) {
        return createErrorResponse('Title, message, and type are required', 400)
      }

      let notification
      if (isGlobal) {
        notification = await notificationService.createGlobalNotification({
          title,
          message,
          type,
          priority,
          metadata
        })
      } else if (recipientRole) {
        notification = await notificationService.createRoleNotification({
          title,
          message,
          type,
          priority,
          recipientRole,
          metadata
        })
      } else {
        return createErrorResponse('Either recipientRole or isGlobal must be specified', 400)
      }

      return NextResponse.json({
        success: true,
        message: 'Notification created successfully',
        notification
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      return createErrorResponse('Failed to create notification', 500)
    }
  }
)