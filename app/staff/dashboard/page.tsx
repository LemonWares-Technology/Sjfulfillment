'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import PaymentGate from '@/app/components/payment-gate'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { useRouter } from 'next/navigation'

interface StaffStats {
  assignedOrders: number
  completedOrders: number
  pendingTasks: number
  recentOrders: any[]
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [stats, setStats] = useState<StaffStats | null>(null)

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const data = await get<StaffStats>('/api/dashboard/stats')
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setStats(null)
    }
  }

    fetchStats()
  }, [])

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'view-orders':
        router.push('/orders')
        break
      case 'manage-stock':
        router.push('/inventory')
        break
      case 'reports':
        router.push('/reports')
        break
      case 'notifications':
        router.push('/notifications')
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole="MERCHANT_STAFF">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17]"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <PaymentGate userRole="MERCHANT_STAFF">
      <DashboardLayout userRole="MERCHANT_STAFF">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f08c17]">Staff Dashboard</h1>
          <p className="mt-2 text-white/90">
            Welcome back, {user?.firstName}! Here are your assigned tasks.
          </p>
          {user?.merchant && (
            <div className="mt-2 p-3 bg-white/20 rounded-[5px] backdrop-blur-md">
              <p className="text-sm text-white/90">
                <strong>Business:</strong> {user.merchant.businessName}
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/30 overflow-hidden shadow-lg backdrop-blur-md rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-600 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Assigned Orders
                    </dt>
                    <dd className="text-lg font-bold text-white/90">
                      {stats?.assignedOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow-lg backdrop-blur-md rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Completed Orders
                    </dt>
                    <dd className="text-lg font-bold text-white/90">
                      {stats?.completedOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow-lg backdrop-blur-md rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Pending Tasks
                    </dt>
                    <dd className="text-lg font-bold text-white/90">
                      {stats?.pendingTasks || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
            <h3 className="text-lg font-semibold text-[#f08c17] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleQuickAction('view-orders')}
                className="p-4 border-2 border-dashed border-white/20 rounded-[5px] hover:border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-blue-400 text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium text-white/90">View Orders</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('manage-stock')}
                className="p-4 border-2 border-dashed border-white/20 rounded-[5px] hover:border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-green-400 text-2xl mb-2">📦</div>
                  <div className="text-sm font-medium text-white/90">Manage Stock</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('reports')}
                className="p-4 border-2 border-dashed border-white/20 rounded-[5px] hover:border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-yellow-300 text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-white/90">Reports</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('notifications')}
                className="p-4 border-2 border-dashed border-white/20 rounded-[5px] hover:border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-purple-300 text-2xl mb-2">🔔</div>
                  <div className="text-sm font-medium text-white/90">Notifications</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
            <h3 className="text-lg font-semibold text-[#f08c17] mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/20 last:border-b-0">
                  <div>
                    <div className="text-sm font-semibold text-white/90">
                      {order.orderNumber}
                    </div>
                    <div className="text-xs text-white/70">
                      {order.customerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white/90">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="text-xs text-white/70">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-white/70 py-4">
                  No recent orders
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </PaymentGate>
  )
}
