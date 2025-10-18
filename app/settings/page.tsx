'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatDate } from '@/app/lib/utils'
import ApiKeyModal from '@/app/components/api-key-modal'
import WebhookModal from '@/app/components/webhook-modal'
import ServiceGate from '@/app/components/service-gate'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast';
import {
  UserIcon,
  ShieldCheckIcon,
  KeyIcon,
  CodeBracketSquareIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface UserSettings {
  id: string
  email: string
  phone: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  emailVerified: string
  createdAt: string
  merchant?: {
    id: string
    businessName: string
    businessEmail: string
    businessPhone: string
    address: string
    city: string
    state: string
    country: string
  }
}

interface ApiKey {
  id: string
  name: string
  publicKey: string
  secretKey?: string
  permissions: any
  isActive: boolean
  lastUsed?: string
  usageCount: number
  rateLimit: number
  createdAt: string
  updatedAt: string
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
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { get, put, delete: del, loading } = useApi()
  const router = useRouter()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    // Always force fresh user data when settings page loads
    const loadFreshData = async () => {
      if (refreshUser) {
        await refreshUser()
      }
      await fetchUserSettings()
    }

    loadFreshData()

    if (activeTab === 'api') {
      fetchApiKeys()
      fetchWebhooks()
    }
  }, [activeTab])


  const fetchUserSettings = async () => {
    try {
      const data = await get<UserSettings>('/api/auth/me', { cache: false, silent: true })
      setUserSettings(data)
      setFormData({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        email: data?.email || '',
        phone: data?.phone || ''
      })
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    }
  }

  const handleSave = async () => {
    try {
      await put('/api/users/profile', formData)
      await fetchUserSettings()
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const fetchApiKeys = async () => {
    try {
      const data = await get<{ apiKeys: ApiKey[] }>('/api/api-keys')
      setApiKeys(data?.apiKeys || [])
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const fetchWebhooks = async () => {
    try {
      const data = await get<{ webhooks: Webhook[] }>('/api/webhooks')
      setWebhooks(data?.webhooks || [])
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    }
  }

  const handleApiKeySave = () => {
    fetchApiKeys()
    setShowApiKeyModal(false)
    setSelectedApiKey(null)
  }

  const handleWebhookSave = () => {
    fetchWebhooks()
    setShowWebhookModal(false)
    setSelectedWebhook(null)
  }

  const openApiKeyModal = (apiKey?: ApiKey) => {
    setSelectedApiKey(apiKey || null)
    setShowApiKeyModal(true)
  }

  const openWebhookModal = (webhook?: Webhook) => {
    setSelectedWebhook(webhook || null)
    setShowWebhookModal(true)
  }

  const handleDeleteApiKey = async (apiKeyId: string, apiKeyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${apiKeyName}"? This action cannot be undone.`)) {
      return
    }

    // Optimistic UI update - remove from list immediately
    setApiKeys(prev => prev.filter(key => key.id !== apiKeyId))

    try {
      console.log('Deleting API key:', apiKeyId)
      await del(`/api/api-keys/${apiKeyId}`)
      console.log('API key deleted successfully')
    } catch (error) {
      console.error('Failed to delete API key:', error)
      // Revert optimistic update on error
      await fetchApiKeys()
    }
  }

  const handleDeleteWebhook = async (webhookId: string, webhookName: string) => {
    if (!confirm(`Are you sure you want to delete the webhook "${webhookName}"? This action cannot be undone.`)) {
      return
    }

    // Optimistic UI update - remove from list immediately
    setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId))

    try {
      console.log('Deleting webhook:', webhookId)
      await del(`/api/webhooks/${webhookId}`)
      console.log('Webhook deleted successfully')
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      // Revert optimistic update on error
      await fetchWebhooks()
    }
  }

  const copyToClipboard = async (text: string, keyType: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(keyType)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'api', name: 'API Management', icon: CodeBracketSquareIcon },
  ]

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F08C17]">Settings</h1>
          <p className="mt-2 text-gray-200">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-[5px] ${activeTab === tab.id
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="bg-white/30 shadow rounded-[5px]">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-[#F08C17]">Profile Information</h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] text-sm"
                    >
                      {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px]"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}

                  {/* Account Info */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">Account Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-200 w-24">Role:</span>
                        <span className="text-gray-200">{userSettings?.role?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-200 w-24">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userSettings?.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {userSettings?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-200 w-24">Member Since:</span>
                        <span className="text-gray-200 gap-2">{formatDate(userSettings?.createdAt || '')}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium text-gray-200 w-24">Email Verified:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userSettings?.emailVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {userSettings?.emailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Info (if applicable) */}
                  {userSettings?.merchant && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-200 mb-4">Business Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-200 w-24">Business:</span>
                          <span className="text-gray-400">{userSettings.merchant.businessName}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-200 w-24">Email:</span>
                          <span className="text-gray-400">{userSettings.merchant.businessEmail}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-200 w-24">Phone:</span>
                          <span className="text-gray-400">{userSettings.merchant.businessPhone}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-200 w-24">Location:</span>
                          <span className="text-gray-400">{userSettings.merchant.city}, {userSettings.merchant.state}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'security' && (
              <div className="bg-white/30 shadow rounded-[5px]">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-[#F08C17] mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-200 mb-2">Change Password</h3>
                      <button
                        onClick={() => router.push('/settings/password')}
                        className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] text-sm"
                      >
                        Update Password
                      </button>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-200 mb-2">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-200 mb-3">Add an extra layer of security to your account</p>
                      {user?.twoFactorEnabled ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-green-600 text-sm">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            2FA is enabled
                          </div>
                          <button
                            onClick={() => {
                              toast.success('Redirecting to disable 2FA...')
                              router.push('/settings/2fa/disable')
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-[5px] text-sm"
                          >
                            Disable 2FA
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            toast.success('Redirecting to enable 2FA...')
                            router.push('/settings/2fa/setup')
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] text-sm"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                {/* API Keys Section */}
                <div className="bg-white/30 shadow rounded-[5px]">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-lg font-medium text-gray-200">API Keys</h2>
                        <p className="text-sm text-gray-200 mt-1">
                          Manage your API keys for external integrations
                        </p>
                      </div>
                      <ServiceGate
                        serviceName="API Access"
                        fallbackMessage="To create API keys, you need to subscribe to the API Access service. This service provides programmatic access to platform features via REST API, webhook support, and third-party integrations."
                        showIconOnly={true}
                      >
                        <button
                          onClick={() => openApiKeyModal()}
                          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] text-sm flex items-center"
                        >
                          <KeyIcon className="h-4 w-4 mr-2" />
                          Create API Key
                        </button>
                      </ServiceGate>
                    </div>

                    {apiKeys.length === 0 ? (
                      <div className="bg-gray-50 rounded-[5px] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">No API Keys</h3>
                            <p className="text-sm text-gray-500">
                              Create your first API key to start integrating with external platforms
                            </p>
                          </div>
                          <button
                            onClick={() => router.push('/api-docs')}
                            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                          >
                            Learn More
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {apiKeys.map((apiKey) => (
                          <div key={apiKey.id} className="bg-black/30 border border-gray-200 rounded-[5px] p-4 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-sm font-medium text-gray-200 truncate">{apiKey.name}</h3>
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${apiKey.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {apiKey.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>

                                {/* API Key Display with 3D Effect */}
                                <div className="mb-3">
                                  <div className="relative">
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-[5px] p-3 shadow-inner">
                                      <div className="flex items-center justify-between">
                                        <code className="text-sm font-mono text-gray-200 break-all pr-2">
                                          {apiKey.publicKey}
                                        </code>
                                        <button
                                          onClick={() => copyToClipboard(apiKey.publicKey, `public-${apiKey.id}`)}
                                          className="flex-shrink-0 p-1.5 text-gray-200 hover:text-gray-200 hover:bg-black/30 rounded-[5px] shadow-sm hover:shadow-md transition-all duration-200"
                                          title="Copy API key"
                                        >
                                          {copiedKey === `public-${apiKey.id}` ? (
                                            <CheckIcon className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <ClipboardDocumentIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    {/* 3D Shadow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200/20 to-gray-300/20 rounded-[5px] transform translate-x-0.5 translate-y-0.5 -z-10"></div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 text-xs text-gray-200">
                                  <span>{apiKey.usageCount} requests</span>
                                  <span>•</span>
                                  <span>{apiKey.rateLimit}/hour limit</span>
                                  <span>•</span>
                                  <span>
                                    {apiKey.lastUsed
                                      ? `Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`
                                      : 'Never used'
                                    }
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => openApiKeyModal(apiKey)}
                                  className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-[5px] transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[5px] transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Webhooks Section */}
                <div className="bg-white/30 shadow rounded-[5px]">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-lg font-medium text-gray-200">Webhooks</h2>
                        <p className="text-sm text-gray-200 mt-1">
                          Configure webhooks to receive real-time notifications
                        </p>
                      </div>
                      <ServiceGate
                        serviceName="API Access"
                        fallbackMessage="To create webhooks, you need to subscribe to the API Access service. This service provides programmatic access to platform features via REST API, webhook support, and third-party integrations."
                        showIconOnly={true}
                      >
                        <button
                          onClick={() => openWebhookModal()}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] text-sm flex items-center"
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Create Webhook
                        </button>
                      </ServiceGate>
                    </div>

                    {webhooks.length === 0 ? (
                      <div className="bg-gray-50 rounded-[5px] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">No Webhooks</h3>
                            <p className="text-sm text-gray-500">
                              Set up webhooks to receive real-time updates about orders and inventory
                            </p>
                          </div>
                          <button
                            onClick={() => router.push('/api-docs')}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Learn More
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {webhooks.map((webhook) => (
                          <div key={webhook.id} className="border border-gray-200 rounded-[5px] p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h3 className="text-sm font-medium text-gray-200">{webhook.name}</h3>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${webhook.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {webhook.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-200 mt-1">
                                  {webhook.url}
                                </p>
                                <p className="text-xs text-gray-200 mt-1">
                                  Events: {webhook.events.join(', ')} • Success: {webhook.successCount} • Failures: {webhook.failureCount}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openWebhookModal(webhook)}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* API Documentation Section */}
                <div className="bg-white/30 shadow rounded-[5px]">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-200 mb-4">API Documentation</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-[5px] p-4">
                        <h3 className="text-sm font-medium text-gray-200 mb-2">Quick Start Guide</h3>
                        <p className="text-sm text-gray-200 mb-3">
                          Get started with our API in minutes
                        </p>
                        <button
                          onClick={() => router.push('/api-docs')}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          View Guide →
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded-[5px] p-4">
                        <h3 className="text-sm font-medium text-gray-200 mb-2">Integration Examples</h3>
                        <p className="text-sm text-gray-200 mb-3">
                          WooCommerce and Shopify integration examples
                        </p>
                        <button
                          onClick={() => router.push('/api-docs')}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          View Examples →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* {activeTab === 'preferences' && (
              <div className="bg-black/30 shadow rounded-[5px]">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-200 mb-6">Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Language
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>English</option>
                        <option>French</option>
                        <option>Spanish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>UTC+1 (West Africa Time)</option>
                        <option>UTC+0 (GMT)</option>
                        <option>UTC-5 (EST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Date Format
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Currency
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option>Nigerian Naira (₦)</option>
                        <option>US Dollar ($)</option>
                        <option>Euro (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => {
          setShowApiKeyModal(false)
          setSelectedApiKey(null)
        }}
        onSave={handleApiKeySave}
        apiKey={selectedApiKey}
      />

      <WebhookModal
        isOpen={showWebhookModal}
        onClose={() => {
          setShowWebhookModal(false)
          setSelectedWebhook(null)
        }}
        onSave={handleWebhookSave}
        webhook={selectedWebhook}
      />
    </DashboardLayout>
  )
}
