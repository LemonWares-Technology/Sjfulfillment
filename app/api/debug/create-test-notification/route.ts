import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { notificationService } from '@/app/lib/notification-service'

// POST /api/debug/create-test-notification - Create test notification (Admin only)
export const POST = withRole(
  ['SJFS_ADMIN'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      // Create a test notification
      const notification = await notificationService.createNotification({
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working',
        type: 'SYSTEM_ALERT',
        priority: 'MEDIUM',
        recipientId: user.userId,
        metadata: {
          test: true,
          createdAt: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: 'Test notification created successfully',
        notification
      })
    } catch (error) {
      console.error('Error creating test notification:', error)
      return createErrorResponse('Failed to create test notification', 500)
    }
  }
)
