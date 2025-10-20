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
      <div className="px-4 py-6 sm:px-0 bg-black/30 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f08c17] drop-shadow">Warehouse Dashboard</h1>
          <p className="mt-2 text-white/80">
            Welcome back, {user?.firstName}! Here's your warehouse overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-white/10 backdrop-blur border border-white/20 shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-600 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Total Inventory
                    </dt>
                    <dd className="text-lg font-bold text-white">
                      {stats?.totalInventory || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/10 backdrop-blur border border-white/20 shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⚠</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-bold text-white">
                      {stats?.lowStockItems || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/10 backdrop-blur border border-white/20 shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/70 truncate">
                      Pending Orders
                    </dt>
                    <dd className="text-lg font-bold text-white">
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
          <div className="bg-white/10 backdrop-blur border border-white/20 shadow rounded-[5px] p-6">
            <h3 className="text-lg font-bold text-[#f08c17] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleQuickAction('manage-inventory')}
                className="p-4 border-2 border-dashed border-white/30 rounded-[5px] hover:border-blue-400 hover:bg-blue-900/30 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-blue-400 text-2xl mb-2">📦</div>
                  <div className="text-sm font-bold text-white">Manage Inventory</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('process-orders')}
                className="p-4 border-2 border-dashed border-white/30 rounded-[5px] hover:border-green-400 hover:bg-green-900/30 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-green-400 text-2xl mb-2">📋</div>
                  <div className="text-sm font-bold text-white">Process Orders</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('stock-reports')}
                className="p-4 border-2 border-dashed border-white/30 rounded-[5px] hover:border-yellow-400 hover:bg-yellow-900/30 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-yellow-400 text-2xl mb-2">📊</div>
                  <div className="text-sm font-bold text-white">Stock Reports</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('warehouse-zones')}
                className="p-4 border-2 border-dashed border-white/30 rounded-[5px] hover:border-purple-400 hover:bg-purple-900/30 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-purple-400 text-2xl mb-2">🏭</div>
                  <div className="text-sm font-bold text-white">Warehouse Zones</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/20 shadow rounded-[5px] p-6">
            <h3 className="text-lg font-bold text-[#f08c17] mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {order.orderNumber}
                    </div>
                    <div className="text-xs text-white/70">
                      {order.merchant?.businessName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="text-xs text-white/70">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-white/60 py-4">
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
