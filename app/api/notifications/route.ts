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

      const notifications = await notificationService.getUserNotifications(user.userId, limit, offset)
      const unreadCount = await notificationService.getUnreadCount(user.userId)

      // Filter unread only if requested
      const filteredNotifications = unreadOnly 
        ? notifications.filter(n => !n.isRead)
        : notifications

      return NextResponse.json({
        success: true,
        notifications: filteredNotifications,
        unreadCount,
        total: filteredNotifications.length
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