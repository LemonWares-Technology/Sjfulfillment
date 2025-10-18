'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/app/lib/auth-context'
import { formatCurrency } from '@/app/lib/utils'

interface RefundRequestModalProps {
  isOpen: boolean
  onClose: () => void
  order: {
    id: string
    orderNumber: string
    customerName: string
    totalAmount: number
    status: string
  }
  onSuccess?: () => void
}

const REFUND_REASONS = [
  { value: 'ORDER_CANCELLED', label: 'Order Cancelled' },
  { value: 'PRODUCT_DEFECTIVE', label: 'Product Defective' },
  { value: 'WRONG_ITEM_SENT', label: 'Wrong Item Sent' },
  { value: 'DELIVERY_DELAYED', label: 'Delivery Delayed' },
  { value: 'CUSTOMER_REJECTED', label: 'Customer Rejected' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'OTHER', label: 'Other' }
]

export default function RefundRequestModal({ isOpen, onClose, order, onSuccess }: RefundRequestModalProps) {
  const { token } = useAuth()
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    requestedAmount: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.reason || !formData.requestedAmount) {
      setError('Please fill in all required fields')
      return
    }

    if (parseFloat(formData.requestedAmount) > order.totalAmount) {
      setError('Requested amount cannot exceed order total')
      return
    }

    if (parseFloat(formData.requestedAmount) <= 0) {
      setError('Requested amount must be greater than 0')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/refund-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: order.id,
          reason: formData.reason,
          description: formData.description,
          requestedAmount: formData.requestedAmount
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Reset form
        setFormData({
          reason: '',
          description: '',
          requestedAmount: ''
        })
        onSuccess?.()
        onClose()
      } else {
        setError(data.error || 'Failed to create refund request')
      }
    } catch (error) {
      console.error('Error creating refund request:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        reason: '',
        description: '',
        requestedAmount: ''
      })
      setError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Request Refund</h2>
              <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Order Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Customer:</strong> {order.customerName}</p>
              <p><strong>Order Total:</strong> {formatCurrency(order.totalAmount)}</p>
              <p><strong>Status:</strong> {order.status}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Refund Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Reason *
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select a reason</option>
              {REFUND_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requested Amount (₦) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={order.totalAmount}
              value={formData.requestedAmount}
              onChange={(e) => setFormData({...formData, requestedAmount: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {formatCurrency(order.totalAmount)}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Provide additional details about the refund request..."
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Refund requests are subject to review and approval. 
                  Processing may take 3-5 business days.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
