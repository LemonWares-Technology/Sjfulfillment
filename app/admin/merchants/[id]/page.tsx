'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { 
  ArrowLeftIcon, 
  KeyIcon, 
  LinkIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { useRouter, useParams } from 'next/navigation'
import ApiKeyModal from '@/app/components/api-key-modal'
import WebhookModal from '@/app/components/webhook-modal'

interface Merchant {
  id: string
  businessName: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  address: string
  city: string
  state: string
  country: string
  cacNumber: string
  businessType: string
  onboardingStatus: string
  subscriptionStatus: string
  isActive: boolean
  createdAt: string
  users: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isActive: boolean
  }[]
  merchantServiceSubscriptions: {
    id: string
    status: string
    service: {
      id: string
      name: string
      price: number
    }
  }[]
  _count: {
    products: number
    orders: number
  }
  accumulatedCharges?: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
}

interface ApiKey {
  id: string
  name: string
  publicKey: string
  permissions: any
  isActive: boolean
  lastUsed?: string
  usageCount: number
  rateLimit: number
  createdAt: string
  updatedAt: string
  merchant?: {
    id: string
    businessName: string
  }
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  lastTriggered?: string
  successCount: number
  failureCount: number
  createdAt: string
  updatedAt: string
  merchant?: {
    id: string
    businessName: string
  }
}

export default function MerchantDetailPage() {
  const { user } = useAuth()
  const { get, delete: deleteApi, loading } = useApi()
  const router = useRouter()
  const params: any = useParams()
  const merchantId = params.id as string

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'api-keys' | 'webhooks'>('overview')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)

  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails()
      fetchApiKeys()
      fetchWebhooks()
    }
  }, [merchantId])

  const fetchMerchantDetails = async () => {
    try {
      console.log('Fetching merchant details for ID:', merchantId)
      const response = await get<Merchant>(`/api/merchants/${merchantId}`)
      console.log('Merchant details response:', response)
      setMerchant(response || null)
    } catch (error) {
      console.error('Failed to fetch merchant details:', error)
    }
  }

  const fetchApiKeys = async () => {
    try {
      const response = await get<{apiKeys: ApiKey[], pagination: any}>(`/api/api-keys?merchantId=${merchantId}`)
      setApiKeys(response?.apiKeys || [])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const fetchWebhooks = async () => {
    try {
      const response = await get<{webhooks: Webhook[], pagination: any}>(`/api/webhooks?merchantId=${merchantId}`)
      setWebhooks(response?.webhooks || [])
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApiKey = async (apiKeyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return
    
    try {
      await deleteApi(`/api/api-keys/${apiKeyId}`)
      fetchApiKeys()
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return
    
    try {
      await deleteApi(`/api/webhooks/${webhookId}`)
      fetchWebhooks()
    } catch (error) {
      console.error('Failed to delete webhook:', error)
    }
  }

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey)
    setShowApiKeyModal(true)
  }

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setShowWebhookModal(true)
  }

  const handleCloseModals = () => {
    setShowApiKeyModal(false)
    setShowWebhookModal(false)
    setEditingApiKey(null)
    setEditingWebhook(null)
  }

  const handleSave = () => {
    fetchApiKeys()
    fetchWebhooks()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout userRole="SJFS_ADMIN">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!merchant) {
    return (
      <DashboardLayout userRole="SJFS_ADMIN">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Merchant Not Found</h1>
            <button
              onClick={() => router.push('/admin/merchants')}
              className="text-white hover:text-amber-800"
            >
              ← Back to Merchants
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="SJFS_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/admin/merchants')}
              className="mr-4 p-2 text-white hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">{merchant.businessName}</h1>
              <p className="mt-2 text-white">
                Merchant ID: {merchant.id}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'api-keys', name: 'API Keys' },
                { id: 'webhooks', name: 'Webhooks' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-white hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Merchant Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/30 rounded-[5px] shadow p-6">
                <h3 className="text-lg font-medium text-white mb-4">Business Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-white">Email:</span>
                    <span className="ml-2 text-sm text-white">{merchant.businessEmail}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Phone:</span>
                    <span className="ml-2 text-sm text-white">{merchant.businessPhone}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Type:</span>
                    <span className="ml-2 text-sm text-white">{merchant.businessType}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">CAC Number:</span>
                    <span className="ml-2 text-sm text-white">{merchant.cacNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/30 rounded-[5px] shadow p-6">
                <h3 className="text-lg font-medium text-white mb-4">Status</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-white">Onboarding:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(merchant.onboardingStatus)}`}>
                      {merchant.onboardingStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Active:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      merchant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {merchant.isActive ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Created:</span>
                    <span className="ml-2 text-sm text-white">{formatDate(merchant.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/30 rounded-[5px] shadow p-6">
                <h3 className="text-lg font-medium text-white mb-4">Statistics</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-white">Users:</span>
                    <span className="ml-2 text-sm text-white">{merchant.users.length}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Products:</span>
                    <span className="ml-2 text-sm text-white">{merchant._count.products}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Orders:</span>
                    <span className="ml-2 text-sm text-white">{merchant._count.orders}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Subscriptions:</span>
                    <span className="ml-2 text-sm text-white">{merchant.merchantServiceSubscriptions.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/30 rounded-[5px] shadow p-6">
                <h3 className="text-lg font-medium text-white mb-4">Accumulated Charges</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-white">Total:</span>
                    <span className="ml-2 text-sm font-semibold text-white">
                      {formatCurrency(merchant.accumulatedCharges?.total || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Paid:</span>
                    <span className="ml-2 text-sm text-green-600">
                      {formatCurrency(merchant.accumulatedCharges?.paid || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Pending:</span>
                    <span className="ml-2 text-sm text-yellow-600">
                      {formatCurrency(merchant.accumulatedCharges?.pending || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Overdue:</span>
                    <span className="ml-2 text-sm text-red-600">
                      {formatCurrency(merchant.accumulatedCharges?.overdue || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white/30 rounded-[5px] shadow p-6">
              <h3 className="text-lg font-medium text-white mb-4">Address</h3>
              <p className="text-white">
                {merchant.businessAddress}<br />
                {merchant.city}, {merchant.state}<br />
                {merchant.country}
              </p>
            </div>

            {/* Users */}
            <div className="bg-white/30 rounded-[5px] shadow p-6">
              <h3 className="text-lg font-medium text-white mb-4">Users</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className=" divide-y divide-gray-200">
                    {merchant.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subscriptions */}
            <div className="bg-white/30 rounded-[5px] shadow p-6">
              <h3 className="text-lg font-medium text-white mb-4">Service Subscriptions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {merchant.merchantServiceSubscriptions.map((subscription) => (
                      <tr key={subscription.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {subscription.service.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatCurrency(subscription.service.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.status}
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

        {activeTab === 'api-keys' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#f08c17]">API Keys</h2>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create API Key
              </button>
            </div>

            <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
              <div className="px-4 py-5 sm:p-6">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <KeyIcon className="mx-auto h-12 w-12 text-white" />
                    <h3 className="mt-2 text-sm font-medium text-white">No API Keys</h3>
                    <p className="mt-1 text-sm text-white">
                      Get started by creating your first API key.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Public Key
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/50 divide-y divide-gray-200">
                        {apiKeys.map((apiKey) => (
                          <tr key={apiKey.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {apiKey.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                              {apiKey.publicKey.substring(0, 20)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {apiKey.usageCount} requests
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                apiKey.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {apiKey.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {formatDate(apiKey.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditApiKey(apiKey)}
                                  className="text-white hover:text-amber-900"
                                  title="Edit API Key"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteApiKey(apiKey.id)}
                                  className="text-white hover:text-red-900"
                                  title="Delete API Key"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#f08c17]">Webhooks</h2>
              <button
                onClick={() => setShowWebhookModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Webhook
              </button>
            </div>

            <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
              <div className="px-4 py-5 sm:p-6">
                {webhooks.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="mx-auto h-12 w-12 text-white" />
                    <h3 className="mt-2 text-sm font-medium text-white">No Webhooks</h3>
                    <p className="mt-1 text-sm text-white">
                      Get started by creating your first webhook.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Events
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Success Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {webhooks.map((webhook) => (
                          <tr key={webhook.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {webhook.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {webhook.url.length > 50 ? `${webhook.url.substring(0, 50)}...` : webhook.url}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {webhook.events.length} events
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {webhook.successCount + webhook.failureCount > 0 
                                ? `${Math.round((webhook.successCount / (webhook.successCount + webhook.failureCount)) * 100)}%`
                                : 'N/A'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                webhook.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {webhook.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(webhook.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditWebhook(webhook)}
                                  className="text-amber-600 hover:text-amber-900"
                                  title="Edit Webhook"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWebhook(webhook.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Webhook"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={handleCloseModals}
          onSave={handleSave}
          apiKey={editingApiKey}
        />

        <WebhookModal
          isOpen={showWebhookModal}
          onClose={handleCloseModals}
          onSave={handleSave}
          webhook={editingWebhook}
        />
      </div>
    </DashboardLayout>
  )
}
