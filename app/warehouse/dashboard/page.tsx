'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { useRouter } from 'next/navigation'

interface WarehouseStats {
  totalInventory: number
  lowStockItems: number
  pendingOrders: number
  recentOrders: any[]
}

export default function WarehouseDashboard() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [stats, setStats] = useState<WarehouseStats | null>(null)

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const data = await get<WarehouseStats>('/api/dashboard/stats')
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
      case 'manage-inventory':
        router.push('/inventory')
        break
      case 'process-orders':
        router.push('/orders')
        break
      case 'stock-reports':
        router.push('/reports')
        break
      case 'warehouse-zones':
        router.push('/warehouses')
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole="WAREHOUSE_STAFF">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="WAREHOUSE_STAFF">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.firstName}! Here's your warehouse overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-600 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Inventory
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalInventory || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⚠</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.lowStockItems || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.pendingOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleQuickAction('manage-inventory')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-blue-600 text-2xl mb-2">📦</div>
                  <div className="text-sm font-medium text-gray-900">Manage Inventory</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('process-orders')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-green-600 text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium text-gray-900">Process Orders</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('stock-reports')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-yellow-600 text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-gray-900">Stock Reports</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('warehouse-zones')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-purple-600 text-2xl mb-2">🏭</div>
                  <div className="text-sm font-medium text-gray-900">Warehouse Zones</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.merchant?.businessName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
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
