'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'
import { useNotifications } from '@/app/lib/notification-context'
import toast from 'react-hot-toast'

interface BulkOperation {
  type: 'products' | 'orders'
  action: string
  selectedItems: string[]
}

interface BulkOperationsModalProps {
  isOpen: boolean
  onClose: () => void
  operation: BulkOperation
  onComplete: () => void
}

const BULK_ACTIONS = {
  products: [
    { value: 'activate', label: 'Activate Products', description: 'Mark selected products as active' },
    { value: 'deactivate', label: 'Deactivate Products', description: 'Mark selected products as inactive' },
    { value: 'update_category', label: 'Update Category', description: 'Change category for selected products' },
    { value: 'update_price', label: 'Update Price', description: 'Change price for selected products' },
    { value: 'delete', label: 'Delete Products', description: 'Permanently delete selected products' }
  ],
  orders: [
    { value: 'update_status', label: 'Update Status', description: 'Change status for selected orders' },
    { value: 'assign_warehouse', label: 'Assign Warehouse', description: 'Assign warehouse to selected orders' },
    { value: 'export', label: 'Export Orders', description: 'Export selected orders to PDF' },
    { value: 'cancel', label: 'Cancel Orders', description: 'Cancel selected orders' }
  ]
}

export default function BulkOperationsModal({ isOpen, onClose, operation, onComplete }: BulkOperationsModalProps) {
  const { post, loading } = useApi()
  const { addNotification } = useNotifications()
  const [selectedAction, setSelectedAction] = useState('')
  const [actionData, setActionData] = useState<any>({})
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (isOpen) {
      setSelectedAction('')
      setActionData({})
      setErrors({})
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!selectedAction) {
      setErrors({ action: 'Please select an action' })
      return
    }

    // Validate action-specific data
    const newErrors: {[key: string]: string} = {}
    
    if (selectedAction === 'update_category' && !actionData.category) {
      newErrors.category = 'Category is required'
    }
    
    if (selectedAction === 'update_price' && (!actionData.price || actionData.price <= 0)) {
      newErrors.price = 'Valid price is required'
    }
    
    if (selectedAction === 'update_status' && !actionData.status) {
      newErrors.status = 'Status is required'
    }
    
    if (selectedAction === 'assign_warehouse' && !actionData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const payload = {
        type: operation.type,
        action: selectedAction,
        itemIds: operation.selectedItems,
        data: actionData
      }

      await post('/api/bulk-operations', payload)

      const actionLabel = BULK_ACTIONS[operation.type].find(a => a.value === selectedAction)?.label || selectedAction
      
      addNotification({
        title: 'Bulk Operation Completed',
        message: `${actionLabel} applied to ${operation.selectedItems.length} ${operation.type}`,
        type: 'SYSTEM'
      })

      toast.success(`Bulk operation completed successfully`)
      onComplete()
      onClose()
    } catch (error) {
      console.error('Bulk operation failed:', error)
      toast.error('Bulk operation failed. Please try again.')
    }
  }

  const getActionConfig = () => {
    return BULK_ACTIONS[operation.type].find(a => a.value === selectedAction)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Bulk Operations
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-amber-50 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>{operation.selectedItems.length}</strong> {operation.type} selected
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Action *
              </label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value)
                  setActionData({})
                  setErrors({})
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose an action...</option>
                {BULK_ACTIONS[operation.type].map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
              {errors.action && <p className="text-red-500 text-xs mt-1">{errors.action}</p>}
            </div>

            {/* Action Description */}
            {selectedAction && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  {getActionConfig()?.description}
                </p>
              </div>
            )}

            {/* Action-specific Fields */}
            {selectedAction === 'update_category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Category *
                </label>
                <input
                  type="text"
                  value={actionData.category || ''}
                  onChange={(e) => setActionData({...actionData, category: e.target.value})}
                  placeholder="Enter category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>
            )}

            {selectedAction === 'update_price' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Price (₦) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actionData.price || ''}
                  onChange={(e) => setActionData({...actionData, price: parseFloat(e.target.value)})}
                  placeholder="Enter new price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>
            )}

            {selectedAction === 'update_status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status *
                </label>
                <select
                  value={actionData.status || ''}
                  onChange={(e) => setActionData({...actionData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select status...</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
              </div>
            )}

            {selectedAction === 'assign_warehouse' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse *
                </label>
                <select
                  value={actionData.warehouseId || ''}
                  onChange={(e) => setActionData({...actionData, warehouseId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select warehouse...</option>
                  {/* This would be populated from an API call */}
                  <option value="warehouse-1">Main Warehouse</option>
                  <option value="warehouse-2">Secondary Warehouse</option>
                </select>
                {errors.warehouseId && <p className="text-red-500 text-xs mt-1">{errors.warehouseId}</p>}
              </div>
            )}

            {/* Confirmation for destructive actions */}
            {(selectedAction === 'delete' || selectedAction === 'cancel') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Warning: This action cannot be undone
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {selectedAction === 'delete' 
                        ? 'Selected products will be permanently deleted.'
                        : 'Selected orders will be cancelled and cannot be restored.'
                      }
                    </p>
                  </div>
                </div>
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
                disabled={loading || !selectedAction}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-md disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Execute
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

