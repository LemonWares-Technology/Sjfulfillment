'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalMerchants: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeSubscriptions: number
  pendingOrders: number
  lowStockItems: number
  recentOrders: any[]
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  console.log(`stats:`, stats)

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const data = await get<DashboardStats>('/api/dashboard/stats')
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
      case 'add-merchant':
        router.push('/admin/merchants')
        break
      case 'manage-products':
        router.push('/products')
        break
      case 'view-orders':
        router.push('/orders')
        break
      case 'warehouses':
        router.push('/warehouses')
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole="SJFS_ADMIN">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="SJFS_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f08c17]">Admin Dashboard</h1>
          <p className="mt-2 text-white">
            Welcome back, {user?.firstName}! Here's what's happening with your platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Merchant Stat */}
          <div className="bg-white/30 rounded-[5px] shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-[#f08c17] to-yellow-600 rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">M</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Total Merchants
                  </dt>
                  <dd className="text-lg font-medium text-white">
                    {stats?.totalMerchants || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Product Stat */}
          <div className="bg-white/30 rounded-[5px] shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-[#f08c17] to-yellow-600 rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">P</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-medium text-white">
                    {stats?.totalProducts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Orders Stat */}
          <div className="bg-white/30 rounded-[5px] shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-[#f08c17] to-yellow-600 rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">O</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-white">
                    {stats?.totalOrders || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Revenue Stat */}
          <div className="bg-white/30 rounded-[5px] shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-[#f08c17] to-yellow-600 rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">₦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-white">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <h3 className="text-lg font-medium text-[#f08c17] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleQuickAction('add-merchant')}
                className="p-4 border-2 border-dashed border-[#f08c17] rounded-[5px] hover:bg-[#f08c17]/10 transition-colors cursor-pointer group"
              >
                <div className="text-center">
                  <div className="text-[#f08c17] text-2xl mb-2 group-hover:text-white">+</div>
                  <div className="text-sm font-medium text-white">Add Merchant</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('manage-products')}
                className="p-4 border-2 border-dashed border-[#f08c17] rounded-[5px] hover:bg-[#f08c17]/10 transition-colors cursor-pointer group"
              >
                <div className="text-center">
                  <div className="text-[#f08c17] text-2xl mb-2 group-hover:text-white">📦</div>
                  <div className="text-sm font-medium text-white">Manage Products</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('view-orders')}
                className="p-4 border-2 border-dashed border-[#f08c17] rounded-[5px] hover:bg-[#f08c17]/10 transition-colors cursor-pointer group"
              >
                <div className="text-center">
                  <div className="text-[#f08c17] text-2xl mb-2 group-hover:text-white">📋</div>
                  <div className="text-sm font-medium text-white">View Orders</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('warehouses')}
                className="p-4 border-2 border-dashed border-[#f08c17] rounded-[5px] hover:bg-[#f08c17]/10 transition-colors cursor-pointer group"
              >
                <div className="text-center">
                  <div className="text-[#f08c17] text-2xl mb-2 group-hover:text-white">🏭</div>
                  <div className="text-sm font-medium text-white">Warehouses</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <h3 className="text-lg font-medium text-[#f08c17] mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/20 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {order.orderNumber}
                    </div>
                    <div className="text-xs text-white/70">
                      {order.merchant?.businessName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
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
  )
}
