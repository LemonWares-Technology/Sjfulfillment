'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { EyeIcon, CheckCircleIcon, XCircleIcon, BuildingOfficeIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import MerchantSubscriptionDetail from '@/app/components/merchant-subscription-detail'

interface MerchantServiceSubscription {
  id: string
  merchantId: string
  serviceId: string
  quantity: number
  priceAtSubscription: number
  status: string
  startDate: string
  endDate: string | null
  createdAt: string
  merchant: {
    id: string
    businessName: string
    businessEmail: string
    businessPhone: string
    contactPerson: string
    address: string
    city: string
    state: string
    onboardingStatus: string
    createdAt: string
    users: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
      isActive: boolean
    }[]
  }
  service: {
    id: string
    name: string
    description: string
    category: string
    price: number
  }
}

interface Merchant {
  id: string
  businessName: string
  businessEmail: string
  businessPhone: string
  contactPerson: string
  address: string
  city: string
  state: string
  onboardingStatus: string
  createdAt: string
  users: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isActive: boolean
  }[]
  subscriptions: MerchantServiceSubscription[]
}

export default function AdminSubscriptionsPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const [subscriptions, setSubscriptions] = useState<MerchantServiceSubscription[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('grouped')
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true)
      const response = await get<{subscriptions: MerchantServiceSubscription[]}>('/api/admin/subscriptions')
      const subscriptionsData = response?.subscriptions || []
      setSubscriptions(subscriptionsData)
      
      // Group subscriptions by merchant
      const merchantMap = new Map<string, Merchant>()
      
      subscriptionsData.forEach(subscription => {
        if (subscription?.merchant?.id) {
          const merchantId = subscription.merchant.id
          if (!merchantMap.has(merchantId)) {
            merchantMap.set(merchantId, {
              ...subscription.merchant,
              subscriptions: []
            })
          }
          merchantMap.get(merchantId)!.subscriptions.push(subscription)
        }
      })
      
      setMerchants(Array.from(merchantMap.values()))
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
      setSubscriptions([])
      setMerchants([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      default:
        return <EyeIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      subscription.merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.merchant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.service.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || subscription.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = 
      merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    
    const hasMatchingSubscriptions = merchant.subscriptions.some(sub => 
      statusFilter === 'ALL' || sub.status === statusFilter
    )
    
    return matchesSearch && hasMatchingSubscriptions
  })

  const totalActiveSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length
  const totalRevenue = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (Number(s.priceAtSubscription) * s.quantity), 0)

  const totalMerchants = merchants.length
  const totalStaff = merchants.reduce((sum, m) => sum + m.users.filter(u => u.isActive).length, 0)

  const toggleMerchantExpansion = (merchantId: string) => {
    const newExpanded = new Set(expandedMerchants)
    if (newExpanded.has(merchantId)) {
      newExpanded.delete(merchantId)
    } else {
      newExpanded.add(merchantId)
    }
    setExpandedMerchants(newExpanded)
  }

  return (
    <DashboardLayout userRole="SJFS_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Merchant Subscriptions</h1>
              <p className="mt-2 text-white">
                Manage all merchant service subscriptions and view detailed analytics
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium ${
                  viewMode === 'grouped'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                    : 'bg-white/30 text-white hover:bg-white/40'
                }`}
              >
                Grouped View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                    : 'bg-white/30 text-white hover:bg-white/40'
                }`}
              >
                Table View
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/30 overflow-hidden shadow rounded-[5px]">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOfficeIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Total Merchants
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {totalMerchants}
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
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Active Subscriptions
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {totalActiveSubscriptions}
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
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Total Staff
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {totalStaff}
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
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white truncate">
                      Daily Revenue
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {formatCurrency(totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search merchants or services..."
              className="w-full px-3 py-2 border border-white/30 bg-transparent text-white placeholder-white/70 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-w-xs">
            <select
              className="w-full px-3 py-2 border border-white/30 bg-transparent text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option className="text-black" value="ALL">All Statuses</option>
              <option className="text-black" value="ACTIVE">Active</option>
              <option className="text-black" value="CANCELLED">Cancelled</option>
              <option className="text-black" value="EXPIRED">Expired</option>
              <option className="text-black" value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'grouped' ? (
          /* Grouped View */
          <div className="space-y-4">
            {filteredMerchants.map((merchant) => (
              <MerchantSubscriptionDetail
                key={merchant.id}
                merchant={merchant}
                isExpanded={expandedMerchants.has(merchant.id)}
                onToggle={() => toggleMerchantExpansion(merchant.id)}
              />
            ))}
            
            {filteredMerchants.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white">No merchants found</p>
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white/30 shadow overflow-hidden rounded-[5px]">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f08c17]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Merchant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Daily Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-white/40">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {subscription.merchant.businessName}
                            </div>
                            <div className="text-sm text-white">
                              {subscription.merchant.businessEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {subscription.service.name}
                            </div>
                            <div className="text-sm text-white">
                              {subscription.service.category}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {subscription.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {formatCurrency(Number(subscription.priceAtSubscription))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(subscription.status)}
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                              {subscription.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatDate(subscription.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {subscription.endDate ? formatDate(subscription.endDate) : 'No end date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-white hover:text-amber-900">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredSubscriptions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-white">No subscriptions found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}