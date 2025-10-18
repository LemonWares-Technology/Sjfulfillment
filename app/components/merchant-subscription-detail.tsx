'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, UserGroupIcon, CurrencyDollarIcon, CalendarIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import CallButton from './call-button'

interface MerchantServiceSubscription {
  id: string
  serviceId: string
  quantity: number
  priceAtSubscription: number
  status: string
  startDate: string
  endDate: string | null
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
  accumulatedCharges?: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
}

interface MerchantSubscriptionDetailProps {
  merchant: Merchant
  isExpanded: boolean
  onToggle: () => void
}

export default function MerchantSubscriptionDetail({ 
  merchant, 
  isExpanded, 
  onToggle 
}: MerchantSubscriptionDetailProps) {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'staff' | 'earnings'>('subscriptions')

  const activeSubscriptions = merchant.subscriptions.filter(s => s.status === 'ACTIVE')
  const totalDailyRevenue = activeSubscriptions.reduce((sum, s) => sum + (Number(s.priceAtSubscription) * s.quantity), 0)
  const totalStaff = merchant.users.length
  const activeStaff = merchant.users.filter(u => u.isActive).length

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

  const getOnboardingStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'SUSPENDED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border border-gray-200 rounded-[5px] mb-4">
      {/* Merchant Header */}
      <div 
        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{merchant.businessName}</h3>
              <p className="text-sm text-gray-600">{merchant.businessEmail}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Quick Stats */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{activeSubscriptions.length}</div>
              <div className="text-xs text-gray-500">Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{activeStaff}</div>
              <div className="text-xs text-gray-500">Staff</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalDailyRevenue)}</div>
              <div className="text-xs text-gray-500">Daily</div>
            </div>
            
            {/* Call Button */}
            <CallButton
              contactInfo={{
                name: merchant.contactPerson,
                phone: merchant.businessPhone,
                email: merchant.businessEmail,
                role: 'Merchant Admin'
              }}
              variant="audio"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 border-t border-gray-200">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'subscriptions'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Subscriptions ({activeSubscriptions.length})
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'staff'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Staff ({activeStaff}/{totalStaff})
                </button>
                <button
                  onClick={() => setActiveTab('earnings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'earnings'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Earnings & Charges
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {merchant.subscriptions.map((subscription) => (
                  <div key={subscription.id} className="bg-white border border-gray-200 rounded-[5px] p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{subscription.service.name}</h4>
                        <p className="text-sm text-gray-600">{subscription.service.category}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{subscription.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Price:</span>
                        <span className="font-medium">{formatCurrency(Number(subscription.priceAtSubscription))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Daily:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(Number(subscription.priceAtSubscription) * subscription.quantity)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span className="text-gray-900">{formatDate(subscription.startDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {merchant.subscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No subscriptions found
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-4">
                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Staff Limit</h4>
                    <p className="text-sm text-yellow-700">
                      Current: {activeStaff} active staff. Maximum allowed: 4 staff members.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {merchant.users.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-[5px] p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium">{user.role.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              {/* Daily Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-[5px] p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <h4 className="text-lg font-semibold text-green-900">Daily Revenue</h4>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDailyRevenue)}</p>
                      <p className="text-sm text-green-700">From active subscriptions</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-8 w-8 text-amber-600 mr-3" />
                    <div>
                      <h4 className="text-lg font-semibold text-amber-900">Monthly Projection</h4>
                      <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalDailyRevenue * 30)}</p>
                      <p className="text-sm text-amber-700">Based on current subscriptions</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-[5px] p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <h4 className="text-lg font-semibold text-orange-900">Accumulated Charges</h4>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(merchant.accumulatedCharges?.total || 0)}</p>
                      <p className="text-sm text-orange-700">
                        Paid: {formatCurrency(merchant.accumulatedCharges?.paid || 0)}
                        {merchant.accumulatedCharges?.pending ? ` • Pending: ${formatCurrency(merchant.accumulatedCharges.pending)}` : ''}
                        {merchant.accumulatedCharges?.overdue ? ` • Overdue: ${formatCurrency(merchant.accumulatedCharges.overdue)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Breakdown */}
              <div className="bg-white border border-gray-200 rounded-[5px] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Service Revenue Breakdown</h4>
                <div className="space-y-3">
                  {activeSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium text-gray-900">{subscription.service.name}</span>
                        <span className="text-sm text-gray-600 ml-2">(x{subscription.quantity})</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(Number(subscription.priceAtSubscription) * subscription.quantity)}
                        </div>
                        <div className="text-sm text-gray-600">per day</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Merchant Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-[5px] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Merchant Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Business Name:</span>
                    <p className="font-medium">{merchant.businessName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Contact Person:</span>
                    <p className="font-medium">{merchant.contactPerson}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-medium">{merchant.businessPhone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{merchant.businessEmail}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <p className="font-medium">{merchant.city}, {merchant.state}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Onboarding Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getOnboardingStatusColor(merchant.onboardingStatus)}`}>
                      {merchant.onboardingStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Joined:</span>
                    <p className="font-medium">{formatDate(merchant.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
