'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/app/lib/use-api'
import { 
  XMarkIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

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

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  apiKey?: ApiKey | null
}

export default function ApiKeyModal({ isOpen, onClose, onSave, apiKey }: ApiKeyModalProps) {
  const { post, put, loading } = useApi()
  const [formData, setFormData] = useState({
    name: '',
    permissions: {
      products: { read: false, write: false, delete: false },
      orders: { read: false, write: false, delete: false },
      inventory: { read: false, write: false },
      webhooks: { read: false, write: false }
    },
    rateLimit: 1000
  })
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [createdApiKey, setCreatedApiKey] = useState<{publicKey: string, secretKey: string} | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (apiKey) {
      setFormData({
        name: apiKey.name,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit
      })
      setCreatedApiKey(null)
      setShowSuccess(false)
    } else {
      setFormData({
        name: '',
        permissions: {
          products: { read: false, write: false, delete: false },
          orders: { read: false, write: false, delete: false },
          inventory: { read: false, write: false },
          webhooks: { read: false, write: false }
        },
        rateLimit: 1000
      })
      setCreatedApiKey(null)
      setShowSuccess(false)
    }
    setErrors({})
  }, [apiKey, isOpen])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (formData.rateLimit < 1 || formData.rateLimit > 10000) {
      newErrors.rateLimit = 'Rate limit must be between 1 and 10,000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      if (apiKey) {
        await put(`/api/api-keys/${apiKey.id}`, formData)
        onSave()
        onClose()
      } else {
        const response = await post<{apiKey: {publicKey: string, secretKey: string}}>('/api/api-keys', formData)
        if (response?.apiKey) {
          setCreatedApiKey(response.apiKey)
          setShowSuccess(true)
          onSave() // Refresh the list
        }
      }
    } catch (error) {
      console.error('Failed to save API key:', error)
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

  const togglePermission = (category: string, permission: string) => {
    setFormData((prev: any) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [permission]: !prev.permissions[category][permission]
        }
      }
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <KeyIcon className="h-6 w-6 text-amber-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {apiKey ? 'Edit API Key' : 'Create API Key'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {showSuccess && createdApiKey ? (
          <div className="p-6">
            {/* Success State */}
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
                <CheckIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">API Key Created Successfully!</h3>
              <p className="text-sm text-gray-500">
                Your API key has been generated. Please copy and store these keys securely.
              </p>
            </div>

            {/* API Keys Display */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Key
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={createdApiKey.publicKey}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-[5px] bg-gray-50 text-sm font-mono pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdApiKey.publicKey, 'public')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedKey === 'public' ? (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={createdApiKey.secretKey}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-[5px] bg-gray-50 text-sm font-mono pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                      title={showSecretKey ? "Hide secret key" : "Show secret key"}
                    >
                      {showSecretKey ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdApiKey.secretKey, 'secret')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedKey === 'secret' ? (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Important Security Notice
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Your secret key will only be shown once. Make sure to copy and store it securely. 
                    You won't be able to retrieve it again.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[5px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., WooCommerce Integration"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Rate Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit (requests per hour)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={formData.rateLimit}
              onChange={(e) => setFormData({...formData, rateLimit: parseInt(e.target.value) || 1000})}
              className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.rateLimit ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.rateLimit && (
              <p className="mt-1 text-sm text-red-600">{errors.rateLimit}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Maximum number of API requests allowed per hour
            </p>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissions
            </label>
            <div className="space-y-4">
              {Object.entries(formData.permissions).map(([category, permissions]) => (
                <div key={category} className="border border-gray-200 rounded-[5px] p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {category}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(permissions).map(([permission, enabled]) => (
                      <label key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => togglePermission(category, permission)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">
                          {permission}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Show API Keys for new keys */}
          {!apiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Important Security Notice
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Your secret key will only be shown once. Make sure to copy and store it securely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show existing API key details */}
          {apiKey && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Key
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={apiKey.publicKey}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-[5px] bg-gray-50 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apiKey.publicKey, 'public')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    {copiedKey === 'public' ? (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {apiKey.secretKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type={showSecretKey ? 'text' : 'password'}
                      value={apiKey.secretKey}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-[5px] bg-gray-50 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecretKey ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(apiKey.secretKey!, 'secret')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {copiedKey === 'secret' ? (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Usage Count:</span>
                  <span className="ml-2 text-gray-900">{apiKey.usageCount}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Last Used:</span>
                  <span className="ml-2 text-gray-900">
                    {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[5px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 border border-transparent rounded-[5px] hover:from-amber-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : apiKey ? 'Update API Key' : 'Create API Key'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
