'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/app/lib/use-api'
import { 
  XMarkIcon, 
  LinkIcon, 
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

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

interface WebhookModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  webhook?: Webhook | null
}

const WEBHOOK_EVENTS = [
  'order.created',
  'order.updated',
  'order.cancelled',
  'order.shipped',
  'order.delivered',
  'product.created',
  'product.updated',
  'product.deleted',
  'inventory.updated',
  'payment.completed',
  'payment.failed',
  'return.created',
  'return.approved',
  'return.rejected'
]

export default function WebhookModal({ isOpen, onClose, onSave, webhook }: WebhookModalProps) {
  const { post, put, loading } = useApi()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    isActive: true
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdWebhook, setCreatedWebhook] = useState<{secret: string} | null>(null)

  useEffect(() => {
    if (webhook) {
      setFormData({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive
      })
      setCreatedWebhook(null)
      setShowSuccess(false)
    } else {
      setFormData({
        name: '',
        url: '',
        events: [],
        isActive: true
      })
      setCreatedWebhook(null)
      setShowSuccess(false)
    }
    setErrors({})
  }, [webhook, isOpen])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = 'Please enter a valid URL'
      }
    }

    if (formData.events.length === 0) {
      newErrors.events = 'At least one event must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      if (webhook) {
        await put(`/api/webhooks/${webhook.id}`, formData)
        onSave()
        onClose()
      } else {
        const response = await post<{webhook: {secret: string}}>('/api/webhooks', formData)
        if (response?.webhook) {
          setCreatedWebhook(response.webhook)
          setShowSuccess(true)
          onSave() // Refresh the list
        }
      }
    } catch (error) {
      console.error('Failed to save webhook:', error)
    }
  }

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <LinkIcon className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {showSuccess && createdWebhook ? (
          <div className="p-6">
            {/* Success State */}
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
                <CheckIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Webhook Created Successfully!</h3>
              <p className="text-sm text-gray-500">
                Your webhook has been created and is ready to receive events.
              </p>
            </div>

            {/* Webhook Secret */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={createdWebhook.secret}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Use this secret to verify webhook signatures in your endpoint.
              </p>
            </div>

            {/* Security Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Important Security Notice
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Store this webhook secret securely. You'll need it to verify that webhook requests 
                    are coming from SJFulfillment.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Order Notifications"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.url ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://your-domain.com/webhook"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                The endpoint where webhook events will be sent
              </p>
            </div>

            {/* Events */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Events *
              </label>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {event}
                    </span>
                  </label>
                ))}
              </div>
              {errors.events && (
                <p className="mt-1 text-sm text-red-600">{errors.events}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Select the events you want to receive notifications for
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active Webhook
              </label>
            </div>

            {/* Show existing webhook details */}
            {webhook && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Webhook Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Success Count:</span>
                    <span className="ml-2 text-gray-900">{webhook.successCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Failure Count:</span>
                    <span className="ml-2 text-gray-900">{webhook.failureCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Last Triggered:</span>
                    <span className="ml-2 text-gray-900">
                      {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(webhook.createdAt).toLocaleDateString()}
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 border border-transparent rounded-md hover:from-amber-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : webhook ? 'Update Webhook' : 'Create Webhook'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}