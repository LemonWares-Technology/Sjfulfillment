'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import PaymentGate from '@/app/components/payment-gate'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { useRouter } from 'next/navigation'

interface MerchantService {
  id: string
  serviceId: string
  quantity: number
  priceAtSubscription: number
  status: string
  service: {
    id: string
    name: string
    description: string
    category: string
    features: string[]
  }
}

interface MerchantStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  activeSubscriptions: number
  pendingOrders: number
  lowStockItems: number
  recentOrders: any[]
}

interface DailyCharges {
  date: string
  dailyCharges: Array<{
    serviceId: string
    serviceName: string
    serviceDescription: string
    serviceCategory: string
    quantity: number
    dailyPrice: number
    totalDailyCharge: number
  }>
  totalDailyCharge: number
  accumulatedCharges: number
  subscriptions: number
}

export default function MerchantDashboard() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [stats, setStats] = useState<MerchantStats | null>(null)
  const [merchantServices, setMerchantServices] = useState<MerchantService[]>([])
  const [dailyCharges, setDailyCharges] = useState<DailyCharges | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dashboard stats
        const statsData = await get<MerchantStats>('/api/dashboard/stats')
        setStats(statsData)

        // Fetch merchant services
        if (user?.merchantId) {
          const services = await get<MerchantService[]>('/api/merchant-services/subscribe')
          setMerchantServices(services)

          // Fetch daily charges
          const charges = await get<DailyCharges>('/api/billing/daily-charges')
          setDailyCharges(charges)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setStats(null)
        setMerchantServices([])
        setDailyCharges(null)
      }
    }

    fetchData()
  }, [user?.merchantId])

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-product':
        router.push('/products')
        break
      case 'manage-stock':
        router.push('/inventory')
        break
      case 'view-orders':
        router.push('/orders')
        break
      case 'manage-staff':
        router.push('/merchant/staff')
        break
      case 'manage-account':
        router.push('/merchant/account')
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole="MERCHANT_ADMIN">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <PaymentGate userRole="MERCHANT_ADMIN">
      <DashboardLayout userRole="MERCHANT_ADMIN">
        <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-300">Merchant Dashboard</h1>
          <p className="mt-2 text-gray-300">
            Welcome back, {user?.firstName}! Here's your business overview.
          </p>
          {user?.merchant && (
            <div className="mt-2 p-3 bg-amber-50 rounded-[5px]">
              <p className="text-sm text-amber-800">
                <strong>Business:</strong> {user.merchant.businessName}
              </p>
              <p className="text-sm text-amber-800">
                <strong>Status:</strong> {user.merchant.onboardingStatus}
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/30 overflow-hidden shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Total Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-300">
                      {stats?.totalProducts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">O</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Total Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-300">
                      {stats?.totalOrders || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">₦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-300">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">!</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Low Stock Items
                    </dt>
                    <dd className="text-lg font-medium text-gray-300">
                      {stats?.lowStockItems || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Charges Section */}
        {dailyCharges && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Daily Service Charges</h2>
            <div className="bg-white/30 border-gray-200 rounded-[5px] p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f08c17]">
                    {formatCurrency(dailyCharges.totalDailyCharge)}
                  </div>
                  <div className="text-sm text-gray-300">Today's Charges</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f08c17]">
                    {formatCurrency(dailyCharges.accumulatedCharges)}
                  </div>
                  <div className="text-sm text-gray-300">Accumulated This Month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dailyCharges.subscriptions}
                  </div>
                  <div className="text-sm text-gray-300">Active Services</div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-300 mb-3">Service Breakdown</h3>
                <div className="space-y-3">
                  {dailyCharges.dailyCharges.map((charge) => (
                    <div key={charge.serviceId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-300">{charge.serviceName}</div>
                        <div className="text-sm text-gray-300">
                          {charge.serviceCategory} • Qty: {charge.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-300">
                          {formatCurrency(charge.totalDailyCharge)}
                        </div>
                        <div className="text-sm text-gray-300">
                          {formatCurrency(charge.dailyPrice)}/day
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 rounded-[5px]">
                <p className="text-sm text-amber-800">
                  <strong>Payment Method:</strong> Cash on Delivery - Charges will be collected when orders are delivered.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscribed Services */}
        {merchantServices.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Your Subscribed Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchantServices.map((service) => (
                <div key={service.id} className="bg-white/30 border border-gray-200 rounded-[5px] p-4">
                  <h3 className="font-semibold text-white mb-2">{service.service.name}</h3>
                  <p className="text-sm text-white mb-3">{service.service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">Qty: {service.quantity}</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(service.priceAtSubscription)}/day
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/30 shadow rounded-[5px] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button 
                onClick={() => handleQuickAction('add-product')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-[5px] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-amber-600 text-2xl mb-2">+</div>
                  <div className="text-sm font-medium text-white">Add Product</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('manage-stock')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-[5px] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-amber-600 text-2xl mb-2">📦</div>
                  <div className="text-sm font-medium text-white">Manage Stock</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('view-orders')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-[5px] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-amber-600 text-2xl mb-2">📋</div>
                  <div className="text-sm font-medium text-white">View Orders</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('manage-staff')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-[5px] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-amber-600 text-2xl mb-2">👥</div>
                  <div className="text-sm font-medium text-white">Manage Staff</div>
                </div>
              </button>
              <button 
                onClick={() => handleQuickAction('manage-account')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-[5px] hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-amber-600 text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium text-white">Account Settings</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white/30 shadow rounded-[5px] p-6">
            <h3 className="text-lg font-medium text-white mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {stats?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {order.orderNumber}
                    </div>
                    <div className="text-xs text-gray-300">
                      {order.customerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-300">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>
              ))
                  
                  || (
                <div className="text-center text-gray-300 py-4">
                  No recent orders
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-white mb-2">Need to contact a customer?</p>
                <button
                  onClick={() => router.push('/orders')}
                  className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                >
                  View All Orders →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </PaymentGate>
  )
}
