import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { notificationService } from '@/app/lib/notification-service'
import { prisma } from '@/app/lib/prisma'

// PUT /api/notifications/[id] - Mark notification as read
export const PUT = withRole(
  ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'],
  async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      
      // Handle case where no body is sent (direct mark as read)
      let action = 'markAsRead'
      try {
        const body = await request.json()
        action = body.action || 'markAsRead'
      } catch (error) {
        // If JSON parsing fails, default to markAsRead
        action = 'markAsRead'
      }

      if (action === 'markAsRead') {
        const notification = await notificationService.markAsRead(id, user.userId)
        return NextResponse.json({
          message: 'Notification marked as read',
          notification
        })
      }

      return createErrorResponse('Invalid action', 400)
    } catch (error) {
      console.error('Error updating notification:', error)
      return createErrorResponse('Failed to update notification', 500)
    }
  }
)

// DELETE /api/notifications/[id] - Delete notification
export const DELETE = withRole(
  ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'],
  async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      console.log('Attempting to delete notification with ID:', id)
      console.log('User ID:', user.userId)
      
      // Check if notification exists and belongs to user or is global
      const notification = await prisma.notification.findFirst({
        where: {
          id,
          OR: [
            { recipientId: user.userId },
            { isGlobal: true }
          ]
        }
      })

      console.log('Found notification:', notification ? 'Yes' : 'No')

      if (!notification) {
        // Let's also check if the notification exists at all (for debugging)
        const anyNotification = await prisma.notification.findUnique({
          where: { id }
        })
        console.log('Notification exists in database:', anyNotification ? 'Yes' : 'No')
        
        return createErrorResponse('Notification not found', 404)
      }

      // Delete the notification
      await prisma.notification.delete({
        where: { id }
      })

      return NextResponse.json({
        message: 'Notification deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      return createErrorResponse('Failed to delete notification', 500)
    }
  }
)