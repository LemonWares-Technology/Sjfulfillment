'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/app/lib/use-api'
import { XMarkIcon, ChartBarIcon, UserGroupIcon, CubeIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { formatCurrency, formatDate } from '@/app/lib/utils'

interface MerchantSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  merchantId: string
}

interface MerchantSummary {
  merchant: {
    id: string
    businessName: string
    businessEmail: string
    businessPhone: string
    address: string
    city: string
    state: string
    country: string
    cacNumber: string
    taxId: string
    onboardingStatus: string
    createdAt: string
    updatedAt: string
  }
  users: any[]
  products: {
    total: number
    active: number
    inactive: number
    list: any[]
  }
  orders: {
    total: number
    delivered: number
    pending: number
    returned: number
    cancelled: number
    deliveryRate: number
    returnRate: number
    cancellationRate: number
  }
  revenue: {
    total: number
    pending: number
    averageOrderValue: number
  }
  recentOrders: any[]
  monthlyStats: any[]
  subscriptions: {
    plans: any[]
    services: any[]
    totalMonthlyCost: number
  }
  performance: {
    overallScore: number
    status: string
  }
}

export default function MerchantSummaryModal({ isOpen, onClose, merchantId }: MerchantSummaryModalProps) {
  const { get, loading } = useApi()
  const [summary, setSummary] = useState<MerchantSummary | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (isOpen && merchantId) {
      fetchSummary()
    }
  }, [isOpen, merchantId])

  const fetchSummary = async () => {
    try {
      const data = await get<MerchantSummary>(`/api/merchants/${merchantId}/summary`)
      setSummary(data)
    } catch (error) {
      console.error('Failed to fetch merchant summary:', error)
    }
  }

  const getPerformanceColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'text-green-600 bg-green-100'
      case 'Good': return 'text-blue-600 bg-blue-100'
      case 'Fair': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-red-600 bg-red-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Merchant Summary</h2>
              {summary && (
                <p className="text-lg text-gray-600">{summary.merchant.businessName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : summary ? (
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'orders', label: 'Orders', icon: ClipboardDocumentListIcon },
                { id: 'products', label: 'Products', icon: CubeIcon },
                { id: 'users', label: 'Users', icon: UserGroupIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                          <span className="text-green-600 text-sm font-medium">📊</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.orders.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">💰</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.revenue.total)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center">
                          <span className="text-amber-600 text-sm font-medium">📦</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Products</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.products.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${getPerformanceColor(summary.performance.status)}`}>
                          <span className="text-sm font-medium">⭐</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Performance</p>
                        <p className="text-lg font-bold text-gray-900">{summary.performance.status}</p>
                        <p className="text-xs text-gray-500">{summary.performance.overallScore}/100</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{summary.orders.delivered}</p>
                      <p className="text-sm text-gray-600">Delivered ({summary.orders.deliveryRate}%)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{summary.orders.pending}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{summary.orders.returned}</p>
                      <p className="text-sm text-gray-600">Returned ({summary.orders.returnRate}%)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{summary.orders.cancelled}</p>
                      <p className="text-sm text-gray-600">Cancelled ({summary.orders.cancellationRate}%)</p>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Business Name</p>
                      <p className="font-medium">{summary.merchant.businessName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CAC Number</p>
                      <p className="font-medium">{summary.merchant.cacNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{summary.merchant.businessEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{summary.merchant.businessPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{summary.merchant.city}, {summary.merchant.state}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        summary.merchant.onboardingStatus === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {summary.merchant.onboardingStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summary.recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Overview</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{summary.products.total}</p>
                      <p className="text-sm text-gray-600">Total Products</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{summary.products.active}</p>
                      <p className="text-sm text-gray-600">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{summary.products.inactive}</p>
                      <p className="text-sm text-gray-600">Inactive</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summary.products.list.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.sku}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(product.unitPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summary.users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.role.replace('_', ' ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">Failed to load merchant summary</p>
          </div>
        )}
      </div>
    </div>
  )
}

