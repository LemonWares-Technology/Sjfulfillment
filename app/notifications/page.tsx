'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Filter, Search } from 'lucide-react'
import { useApi } from '@/app/lib/use-api'
import DashboardLayout from '../components/dashboard-layout'
import { useAuth } from '../lib/auth-context'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  createdAt: string
  metadata?: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const { callApi } = useApi()
  const { user } = useAuth()

  const fetchNotifications = async (page: number = 1, unreadOnly: boolean = false) => {
    try {
      setLoading(true)
      const response = await callApi(`/api/notifications?limit=20&offset=${(page - 1) * 20}&unreadOnly=${unreadOnly}`)
      if (response.success) {
        setNotifications(response.data.notifications)
        setUnreadCount(response.data.unreadCount)
        setTotalPages(Math.ceil(response.data.total / 20))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await callApi(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'markAsRead' })
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, isRead: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await callApi('/api/notifications/mark-all-read', {
        method: 'PUT'
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  useEffect(() => {
    const unreadOnly = filter === 'unread'
    fetchNotifications(currentPage, unreadOnly)
  }, [currentPage, filter])

  const filteredNotifications = notifications.filter(notification => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower) ||
        notification.type.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-blue-500'
      case 'LOW': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
      case 'ORDER_DELIVERED':
      case 'ORDER_CANCELLED':
        return '📦'
      case 'STOCK_LOW':
      case 'STOCK_OUT':
        return '📊'
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_FAILED':
        return '💰'
      case 'MERCHANT_REGISTERED':
      case 'MERCHANT_APPROVED':
        return '🏢'
      case 'SYSTEM_ALERT':
        return '⚠️'
      default:
        return '🔔'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <DashboardLayout userRole={user?.role || "MERCHANT_ADMIN"}>
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white/30 rounded-[5px] shadow-sm border border-white/30 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-8 w-8 text-[#f08c17]" />
                <div>
                  <h1 className="text-2xl font-bold text-[#f08c17]">Notifications</h1>
                  <p className="text-white">
                    {unreadCount} unread notifications
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-[5px] hover:from-amber-600 hover:to-yellow-700 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/30 rounded-[5px] shadow-sm border border-white/30 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              {/* Filter Buttons */}
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-white" />
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'unread', label: 'Unread' },
                    { key: 'read', label: 'Read' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setFilter(key as any)
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1 rounded-[5px] text-sm font-medium transition-colors ${filter === key
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-[5px] text-white placeholder-white/70 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white/30 rounded-[5px] shadow-sm border border-white/30">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="mt-2 text-white">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-[#f08c17] mx-auto mb-4" />
                <p className="text-white">
                  {searchTerm ? 'No notifications match your search.' : 'No notifications yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/30">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-white/40 transition-colors ${!notification.isRead ? 'bg-white/20' : ''
                      }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
                          {getTypeIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className={`text-lg font-medium ${!notification.isRead ? 'text-white' : 'text-white/90'
                              }`}>
                              {notification.title}
                            </h3>
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-white/80">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-white/70 hover:text-white transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className={`mt-2 ${!notification.isRead ? 'text-white' : 'text-white/90'
                          }`}>
                          {notification.message}
                        </p>

                        <div className="mt-3 flex items-center space-x-4 text-sm text-white/80">
                          <span className="capitalize">{notification.type.replace('_', ' ').toLowerCase()}</span>
                          <span className="capitalize">{notification.priority.toLowerCase()} priority</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-white/30 rounded-[5px] text-sm font-medium text-white bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-3 py-2 text-sm text-white">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-white/30 rounded-[5px] text-sm font-medium text-white bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}