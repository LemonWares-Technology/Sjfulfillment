'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import { useNotifications } from './notification-context'
import { io, Socket } from 'socket.io-client'

interface WebSocketMessage {
  type: 'order_update' | 'stock_alert' | 'payment_received' | 'logistics_update' | 'warehouse_alert' | 'system_notification'
  data: any
  timestamp: string
}

interface WebSocketContextType {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  sendMessage: (message: any) => void
  subscribe: (eventType: string, callback: (data: any) => void) => void
  unsubscribe: (eventType: string, callback: (data: any) => void) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: any) => void>>>(new Map())

  const handleMessage = useCallback((type: string, data: any) => {
    // Notify subscribers
    const callbacks = subscribers.get(type)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          // Handle callback error silently
        }
      })
    }
    
    // Add notification for certain message types
    if (['order_update', 'stock_alert', 'payment_received', 'logistics_update', 'warehouse_alert'].includes(type)) {
      addNotification({
        type: type.toUpperCase() as any,
        title: getNotificationTitle(type),
        message: getNotificationMessage(type, data)
      })
    }
  }, [subscribers, addNotification])

  const connect = useCallback(() => {
    if (!user || socket) return

    try {
      setConnectionStatus('connecting')
      
      // Vercel doesn't support persistent WebSocket connections
      // Fall back to polling only for production
      const isProduction = process.env.NODE_ENV === 'production'
      
      const newSocket = io('/', {
        path: '/api/socketio',
        transports: isProduction ? ['polling'] : ['websocket', 'polling'],
        autoConnect: true,
        reconnection: !isProduction, // Disable reconnection in production
        reconnectionDelay: 3000,
        reconnectionAttempts: isProduction ? 0 : 5,
        timeout: 20000,
        forceNew: true,
        // Additional polling options for Vercel
        ...(isProduction && {
          polling: {
            extraHeaders: {
              'X-Forwarded-Proto': 'https'
            }
          }
        })
      })
      
      newSocket.on('connect', () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Send authentication message
        newSocket.emit('auth', {
          token: localStorage.getItem('token'),
          userId: user.id,
          role: user.role,
          merchantId: user.merchantId
        })
      })
      
      newSocket.on('auth_success', (data) => {
        // Authentication successful
      })
      
      newSocket.on('order_update', (data) => {
        handleMessage('order_update', data)
      })
      
      newSocket.on('stock_alert', (data) => {
        handleMessage('stock_alert', data)
      })
      
      newSocket.on('payment_received', (data) => {
        handleMessage('payment_received', data)
      })
      
      newSocket.on('logistics_update', (data) => {
        handleMessage('logistics_update', data)
      })
      
      newSocket.on('warehouse_alert', (data) => {
        handleMessage('warehouse_alert', data)
      })
      
      newSocket.on('system_notification', (data) => {
        handleMessage('system_notification', data)
      })
      
      newSocket.on('disconnect', (reason) => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      })
      
      newSocket.on('connect_error', (error) => {
        setConnectionStatus('error')
        setIsConnected(false)
        
        // Log error but don't crash the app in production
        console.warn('WebSocket connection failed:', error.message || error)
      })
      
      newSocket.on('reconnect', (attemptNumber) => {
        setConnectionStatus('connected')
        setIsConnected(true)
      })
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        setConnectionStatus('connecting')
      })
      
      newSocket.on('reconnect_error', (error) => {
        setConnectionStatus('error')
      })
      
      newSocket.on('reconnect_failed', () => {
        setConnectionStatus('error')
        setIsConnected(false)
      })
      
      setSocket(newSocket)
    } catch (error) {
      setConnectionStatus('error')
      
      // Log error but don't crash the app in production
      console.warn('WebSocket initialization failed:', error)
    }
  }, [user, socket, handleMessage])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [socket])

  useEffect(() => {
    if (user) {
      connect()
    } else {
      disconnect()
    }
    
    return () => {
      disconnect()
    }
  }, [user, connect, disconnect])

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.connected) {
      socket.emit(message.type, message.data)
    }
  }, [socket])

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newSubscribers = new Map(prev)
      if (!newSubscribers.has(eventType)) {
        newSubscribers.set(eventType, new Set())
      }
      newSubscribers.get(eventType)!.add(callback)
      return newSubscribers
    })
  }, [])

  const unsubscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newSubscribers = new Map(prev)
      const callbacks = newSubscribers.get(eventType)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          newSubscribers.delete(eventType)
        }
      }
      return newSubscribers
    })
  }, [])

  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case 'order_update':
        return 'Order Update'
      case 'stock_alert':
        return 'Stock Alert'
      case 'payment_received':
        return 'Payment Received'
      case 'logistics_update':
        return 'Logistics Update'
      case 'warehouse_alert':
        return 'Warehouse Alert'
      default:
        return 'System Notification'
    }
  }

  const getNotificationMessage = (type: string, data: any): string => {
    switch (type) {
      case 'order_update':
        return `Order ${data.orderNumber || data.id} has been updated`
      case 'stock_alert':
        return `Low stock alert for ${data.productName || 'product'}`
      case 'payment_received':
        return `Payment of ${data.amount || 'N/A'} received`
      case 'logistics_update':
        return `Delivery update for order ${data.orderNumber || data.id}`
      case 'warehouse_alert':
        return `Warehouse alert: ${data.message || 'Check warehouse status'}`
      default:
        return data.message || 'System notification received'
    }
  }

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    subscribe,
    unsubscribe
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}