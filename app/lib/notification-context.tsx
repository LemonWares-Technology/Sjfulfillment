'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: 'ORDER' | 'STOCK' | 'PAYMENT' | 'SYSTEM' | 'LOGISTICS' | 'WAREHOUSE'
  isRead: boolean
  createdAt: string
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedNotifications = localStorage.getItem(`notifications_${user.id}`)
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications)
          setNotifications(parsed)
          setUnreadCount(parsed.filter((n: Notification) => !n.isRead).length)
        } catch (error) {
          console.error('Failed to parse saved notifications:', error)
        }
      }
    }
  }, [user])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications))
    }
  }, [notifications, user])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    }

    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)

    // Show toast notification
    const getToastIcon = (type: string) => {
      switch (type) {
        case 'ORDER': return '📦'
        case 'STOCK': return '📊'
        case 'PAYMENT': return '💰'
        case 'LOGISTICS': return '🚚'
        case 'WAREHOUSE': return '🏭'
        case 'SYSTEM': return '⚙️'
        default: return '🔔'
      }
    }

    const getToastColor = (type: string) => {
      switch (type) {
        case 'ORDER': return 'blue'
        case 'STOCK': return 'yellow'
        case 'PAYMENT': return 'green'
        case 'LOGISTICS': return 'purple'
        case 'WAREHOUSE': return 'orange'
        case 'SYSTEM': return 'gray'
        default: return 'blue'
      }
    }

    toast.success(`${getToastIcon(notification.type)} ${notification.title}`, {
      duration: 5000,
      style: {
        background: getToastColor(notification.type) === 'blue' ? '#3B82F6' : 
                   getToastColor(notification.type) === 'green' ? '#10B981' :
                   getToastColor(notification.type) === 'yellow' ? '#F59E0B' :
                   getToastColor(notification.type) === 'purple' ? '#8B5CF6' :
                   getToastColor(notification.type) === 'orange' ? '#F97316' : '#6B7280',
        color: '#fff',
      },
    })
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, isRead: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  const removeNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setNotifications(prev => {
          const notification = prev.find(n => n.id === id)
          const newNotifications = prev.filter(n => n.id !== id)
          if (notification && !notification.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
          return newNotifications
        })
      }
    } catch (error) {
      console.error('Failed to remove notification:', error)
    }
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Auto-generate notifications based on user actions
  useEffect(() => {
    if (!user) return

    // Example: Generate a welcome notification for new users
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.id}`)
    if (!hasSeenWelcome) {
      setTimeout(() => {
        addNotification({
          title: 'Welcome to SJFulfillment!',
          message: 'Your account is ready. Start by exploring the dashboard and setting up your first products.',
          type: 'SYSTEM'
        })
        localStorage.setItem(`welcome_seen_${user.id}`, 'true')
      }, 2000)
    }
  }, [user, addNotification])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Hook for generating notifications based on business events
export function useNotificationGenerator() {
  const { addNotification } = useNotifications()

  const notifyOrderUpdate = useCallback((orderNumber: string, status: string) => {
    addNotification({
      title: `Order ${orderNumber} Updated`,
      message: `Order status changed to ${status}`,
      type: 'ORDER',
      data: { orderNumber, status }
    })
  }, [addNotification])

  const notifyLowStock = useCallback((productName: string, currentStock: number) => {
    addNotification({
      title: 'Low Stock Alert',
      message: `${productName} is running low (${currentStock} remaining)`,
      type: 'STOCK',
      data: { productName, currentStock }
    })
  }, [addNotification])

  const notifyPaymentReceived = useCallback((amount: number, orderNumber: string) => {
    addNotification({
      title: 'Payment Received',
      message: `Payment of ₦${amount.toLocaleString()} received for order ${orderNumber}`,
      type: 'PAYMENT',
      data: { amount, orderNumber }
    })
  }, [addNotification])

  const notifyLogisticsUpdate = useCallback((partnerName: string, status: string) => {
    addNotification({
      title: 'Logistics Update',
      message: `${partnerName} status: ${status}`,
      type: 'LOGISTICS',
      data: { partnerName, status }
    })
  }, [addNotification])

  const notifyWarehouseAlert = useCallback((warehouseName: string, alert: string) => {
    addNotification({
      title: 'Warehouse Alert',
      message: `${warehouseName}: ${alert}`,
      type: 'WAREHOUSE',
      data: { warehouseName, alert }
    })
  }, [addNotification])

  return {
    notifyOrderUpdate,
    notifyLowStock,
    notifyPaymentReceived,
    notifyLogisticsUpdate,
    notifyWarehouseAlert
  }
}

