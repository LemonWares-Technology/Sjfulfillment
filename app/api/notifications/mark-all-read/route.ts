import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { notificationService } from '@/app/lib/notification-service'

// PUT /api/notifications/mark-all-read - Mark all notifications as read
export const PUT = withRole(
  ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const result = await notificationService.markAllAsRead(user.userId)
      
      return NextResponse.json({
        message: 'All notifications marked as read',
        count: result.count
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return createErrorResponse('Failed to mark all notifications as read', 500)
    }
  }
)
