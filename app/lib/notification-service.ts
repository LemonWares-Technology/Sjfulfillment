import { prisma } from './prisma'

export interface NotificationData {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  recipientId?: string
  recipientRole?: UserRole
  isGlobal?: boolean
  metadata?: any
}

export type NotificationType = 
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'STOCK_LOW'
  | 'STOCK_OUT'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'MERCHANT_REGISTERED'
  | 'MERCHANT_APPROVED'
  | 'MERCHANT_SUSPENDED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'WAREHOUSE_ALERT'
  | 'SYSTEM_ALERT'
  | 'BILLING_ALERT'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_RENEWED'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type UserRole = 'SJFS_ADMIN' | 'MERCHANT_ADMIN' | 'MERCHANT_STAFF' | 'WAREHOUSE_STAFF'

class NotificationService {
  /**
   * Create a single notification
   */
  async createNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority || 'MEDIUM',
          recipientId: data.recipientId,
          recipientRole: data.recipientRole,
          isGlobal: data.isGlobal || false,
          metadata: data.metadata || {}
        }
      })

      console.log(`Notification created: ${notification.title} for ${data.recipientRole || 'Global'}`)
      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Create notifications for multiple recipients
   */
  async createBulkNotifications(data: Omit<NotificationData, 'recipientId'>[], recipientIds: string[]) {
    try {
      const notifications = await Promise.all(
        recipientIds.map(recipientId =>
          this.createNotification({ ...data[0], recipientId })
        )
      )
      return notifications
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw error
    }
  }

  /**
   * Create notification for all users of a specific role
   */
  async createRoleNotification(data: Omit<NotificationData, 'recipientId' | 'recipientRole'> & { recipientRole: UserRole }) {
    try {
      // Get all users with the specified role
      const users = await prisma.user.findMany({
        where: {
          role: data.recipientRole,
          isActive: true
        },
        select: { id: true }
      })

      if (users.length === 0) {
        console.log(`No active users found for role: ${data.recipientRole}`)
        return []
      }

      // Create notifications for all users
      const notifications = await Promise.all(
        users.map(user =>
          this.createNotification({
            ...data,
            recipientId: user.id,
            recipientRole: data.recipientRole
          })
        )
      )

      console.log(`Created ${notifications.length} notifications for role: ${data.recipientRole}`)
      return notifications
    } catch (error) {
      console.error('Error creating role notifications:', error)
      throw error
    }
  }

  /**
   * Create global notification for all users
   */
  async createGlobalNotification(data: Omit<NotificationData, 'recipientId' | 'recipientRole' | 'isGlobal'>) {
    try {
      const notification = await this.createNotification({
        ...data,
        isGlobal: true
      })

      console.log(`Global notification created: ${notification.title}`)
      return notification
    } catch (error) {
      console.error('Error creating global notification:', error)
      throw error
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          OR: [
            { recipientId: userId },
            { isGlobal: true }
          ]
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return notification
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          OR: [
            { recipientId: userId },
            { isGlobal: true }
          ],
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      console.log(`Marked ${result.count} notifications as read for user: ${userId}`)
      return result
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { recipientId: userId },
            { isGlobal: true }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      })

      return notifications
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      throw error
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          OR: [
            { recipientId: userId },
            { isGlobal: true }
          ],
          isRead: false
        }
      })

      return count
    } catch (error) {
      console.error('Error fetching unread notification count:', error)
      throw error
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      })

      console.log(`Deleted ${result.count} old notifications`)
      return result
    } catch (error) {
      console.error('Error deleting old notifications:', error)
      throw error
    }
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  ORDER_CREATED: (orderNumber: string, customerName: string) => ({
    title: 'New Order Received',
    message: `Order ${orderNumber} has been placed by ${customerName}`,
    type: 'ORDER_CREATED' as NotificationType,
    priority: 'HIGH' as NotificationPriority
  }),

  ORDER_DELIVERED: (orderNumber: string, customerName: string) => ({
    title: 'Order Delivered',
    message: `Order ${orderNumber} has been successfully delivered to ${customerName}`,
    type: 'ORDER_DELIVERED' as NotificationType,
    priority: 'MEDIUM' as NotificationPriority
  }),

  STOCK_LOW: (productName: string, currentStock: number, reorderLevel: number) => ({
    title: 'Low Stock Alert',
    message: `${productName} is running low. Current stock: ${currentStock}, Reorder level: ${reorderLevel}`,
    type: 'STOCK_LOW' as NotificationType,
    priority: 'HIGH' as NotificationPriority
  }),

  STOCK_OUT: (productName: string) => ({
    title: 'Out of Stock',
    message: `${productName} is out of stock and needs immediate attention`,
    type: 'STOCK_OUT' as NotificationType,
    priority: 'URGENT' as NotificationPriority
  }),

  MERCHANT_REGISTERED: (merchantName: string) => ({
    title: 'New Merchant Registration',
    message: `${merchantName} has registered and is pending approval`,
    type: 'MERCHANT_REGISTERED' as NotificationType,
    priority: 'MEDIUM' as NotificationPriority
  }),

  PAYMENT_RECEIVED: (amount: number, orderNumber: string) => ({
    title: 'Payment Received',
    message: `Payment of ₦${amount.toLocaleString()} received for order ${orderNumber}`,
    type: 'PAYMENT_RECEIVED' as NotificationType,
    priority: 'MEDIUM' as NotificationPriority
  }),

  RETURN_REQUESTED: (orderNumber: string, reason: string) => ({
    title: 'Return Request',
    message: `Return requested for order ${orderNumber}. Reason: ${reason}`,
    type: 'RETURN_REQUESTED' as NotificationType,
    priority: 'HIGH' as NotificationPriority
  }),

  SYSTEM_ALERT: (message: string) => ({
    title: 'System Alert',
    message,
    type: 'SYSTEM_ALERT' as NotificationType,
    priority: 'HIGH' as NotificationPriority
  })
}

export const notificationService = new NotificationService()
