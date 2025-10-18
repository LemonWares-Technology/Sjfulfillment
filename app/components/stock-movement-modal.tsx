'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface StockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  stockItemId: string | null
  onSave: () => void
}

export default function StockMovementModal({ isOpen, onClose, stockItemId, onSave }: StockMovementModalProps) {
  const { post, get, loading } = useApi()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    type: 'IN',
    quantity: '',
    reason: '',
    reference: '',
    notes: '',
    targetWarehouseId: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses()
    }
  }, [isOpen])

  const fetchWarehouses = async () => {
    try {
      const response = await get<{warehouses: any[]}>('/api/warehouses')
      setWarehouses(response?.warehouses || [])
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stockItemId) return
    
    // Validate quantity
    const quantity = parseInt(formData.quantity)
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity greater than 0')
      return
    }
    
    try {
      await post(`/api/stock/${stockItemId}/movements`, {
        ...formData,
        quantity: quantity
      })
      setFormData({
        type: 'IN',
        quantity: '',
        reason: '',
        reference: '',
        notes: '',
        targetWarehouseId: ''
      })
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to record stock movement:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Record Stock Movement</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Movement Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="TRANSFER">Transfer</option>
                <option value="DAMAGE">Damage</option>
                <option value="RETURN">Return</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="Enter quantity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <select
                required
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Reason</option>
                {formData.type === 'IN' && (
                  <>
                    <option value="PURCHASE">Purchase</option>
                    <option value="RESTOCK">Restock</option>
                    <option value="RETURN_FROM_CUSTOMER">Return from Customer</option>
                    <option value="PRODUCTION">Production</option>
                  </>
                )}
                {formData.type === 'OUT' && (
                  <>
                    <option value="SALE">Sale</option>
                    <option value="TRANSFER_OUT">Transfer Out</option>
                    <option value="SAMPLE">Sample</option>
                    <option value="PROMOTION">Promotion</option>
                  </>
                )}
                {formData.type === 'ADJUSTMENT' && (
                  <>
                    <option value="INVENTORY_COUNT">Inventory Count</option>
                    <option value="CORRECTION">Correction</option>
                    <option value="WRITE_OFF">Write Off</option>
                  </>
                )}
                {formData.type === 'TRANSFER' && (
                  <>
                    <option value="WAREHOUSE_TRANSFER">Warehouse Transfer</option>
                    <option value="LOCATION_CHANGE">Location Change</option>
                  </>
                )}
                {formData.type === 'DAMAGE' && (
                  <>
                    <option value="DAMAGED_GOODS">Damaged Goods</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="LOST">Lost</option>
                  </>
                )}
                {formData.type === 'RETURN' && (
                  <>
                    <option value="CUSTOMER_RETURN">Customer Return</option>
                    <option value="SUPPLIER_RETURN">Supplier Return</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                placeholder="e.g., PO-001, INV-123"
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Warehouse Selection for Transfers */}
            {formData.type === 'TRANSFER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Warehouse *
                </label>
                <select
                  required={formData.type === 'TRANSFER'}
                  value={formData.targetWarehouseId}
                  onChange={(e) => setFormData({...formData, targetWarehouseId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select target warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

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
                {loading ? 'Recording...' : 'Record Movement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
