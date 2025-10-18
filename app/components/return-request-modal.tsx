'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'
import { useNotifications } from '@/app/lib/notification-context'
import { formatCurrency } from '@/app/lib/utils'

interface OrderItem {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    sku: string
    images: string[]
    unitPrice: number
  }
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  totalAmount: number
  status: string
  createdAt: string
  orderItems: OrderItem[]
}

interface ReturnRequest {
  orderId: string
  reason: string
  items: {
    orderItemId: string
    quantity: number
    reason: string
    condition: 'NEW' | 'USED' | 'DAMAGED' | 'DEFECTIVE'
  }[]
  notes?: string
}

interface ReturnRequestModalProps {
  isOpen: boolean
  onClose: () => void
  order?: Order | null
  onSuccess?: () => void
}

export default function ReturnRequestModal({ isOpen, onClose, order, onSuccess }: ReturnRequestModalProps) {
  const { post, loading } = useApi()
  const { addNotification } = useNotifications()
  const [formData, setFormData] = useState<ReturnRequest>({
    orderId: '',
    reason: '',
    items: [],
    notes: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (order) {
      setFormData({
        orderId: order.id,
        reason: '',
        items: order.orderItems.map(item => ({
          orderItemId: item.id,
          quantity: 0,
          reason: '',
          condition: 'NEW' as const
        })),
        notes: ''
      })
    }
  }, [order])

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
    setErrors(prev => ({ ...prev, [`items.${index}.${field}`]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.reason) {
      newErrors.reason = 'Return reason is required'
    }

    const hasSelectedItems = formData.items.some(item => item.quantity > 0)
    if (!hasSelectedItems) {
      newErrors.items = 'Please select at least one item to return'
    }

    formData.items.forEach((item, index) => {
      if (item.quantity > 0) {
        if (!item.reason) {
          newErrors[`items.${index}.reason`] = 'Item return reason is required'
        }
        if (item.quantity > (order?.orderItems.find(oi => oi.id === item.orderItemId)?.quantity || 0)) {
          newErrors[`items.${index}.quantity`] = 'Quantity cannot exceed ordered amount'
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      // Filter out items with quantity 0
      const returnItems = formData.items.filter(item => item.quantity > 0)
      
      console.log('Submitting return request:', {
        ...formData,
        items: returnItems
      })
      
      await post('/api/returns', {
        ...formData,
        items: returnItems
      })

      console.log('Return request submitted successfully')

      addNotification({
        title: 'Return Request Submitted',
        message: `Return request for order ${order?.orderNumber} has been submitted successfully`,
        type: 'ORDER'
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to submit return request:', error)
      setErrors({ submit: 'Failed to submit return request. Please try again.' })
    }
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Create Return Request - Order #{order.orderNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Order Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Order Date:</span>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount:</span>
                  <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium">{order.status}</p>
                </div>
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Reason *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a reason</option>
                <option value="DEFECTIVE">Product is defective</option>
                <option value="WRONG_ITEM">Wrong item received</option>
                <option value="DAMAGED">Item arrived damaged</option>
                <option value="NOT_AS_DESCRIBED">Not as described</option>
                <option value="CHANGED_MIND">Changed mind</option>
                <option value="SIZE_ISSUE">Size doesn't fit</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
            </div>

            {/* Items to Return */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items to Return *
              </label>
              <div className="space-y-4">
                {formData.items.map((item, index) => {
                  const orderItem = order.orderItems.find(oi => oi.id === item.orderItemId)
                  if (!orderItem) return null

                  return (
                    <div key={item.orderItemId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        {orderItem.product.images && orderItem.product.images.length > 0 && (
                          <img
                            src={orderItem.product.images[0]}
                            alt={orderItem.product.name}
                            className="h-16 w-16 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{orderItem.product.name}</h4>
                          <p className="text-sm text-gray-500">SKU: {orderItem.product.sku}</p>
                          <p className="text-sm text-gray-500">Ordered: {orderItem.quantity} units</p>
                          <p className="text-sm text-gray-500">Unit Price: {formatCurrency(orderItem.product.unitPrice)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity to Return
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={orderItem.quantity}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          {errors[`items.${index}.quantity`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`items.${index}.quantity`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item Condition
                          </label>
                          <select
                            value={item.condition}
                            onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="NEW">New/Unused</option>
                            <option value="USED">Used</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="DEFECTIVE">Defective</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item Reason
                          </label>
                          <input
                            type="text"
                            value={item.reason}
                            onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                            placeholder="Specific reason for this item"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          {errors[`items.${index}.reason`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`items.${index}.reason`]}</p>
                          )}
                        </div>
                      </div>

                      {item.quantity > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 rounded-md">
                          <p className="text-sm text-amber-800">
                            Refund Amount: {formatCurrency(item.quantity * orderItem.product.unitPrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items}</p>}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Any additional information about the return..."
              />
            </div>

            {/* Total Refund Amount */}
            {formData.items.some(item => item.quantity > 0) && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-medium text-green-800">Total Refund Amount</h3>
                </div>
                <p className="text-lg font-semibold text-green-900 mt-1">
                  {formatCurrency(formData.items.reduce((total, item) => {
                    const orderItem = order.orderItems.find(oi => oi.id === item.orderItemId)
                    return total + (item.quantity * (orderItem?.product.unitPrice || 0))
                  }, 0))}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  This amount will be refunded to the customer once the return is processed.
                </p>
              </div>
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

