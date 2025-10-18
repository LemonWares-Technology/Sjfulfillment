'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface WarehouseZone {
  id?: string
  name: string
  code?: string
  description: string
  capacity: number
  zoneType: string
  isActive: boolean
}

interface WarehouseZoneModalProps {
  isOpen: boolean
  onClose: () => void
  warehouseId: string | null
  zone?: WarehouseZone | null
  onSave: () => void
}

export default function WarehouseZoneModal({ isOpen, onClose, warehouseId, zone, onSave }: WarehouseZoneModalProps) {
  const { post, put, loading } = useApi()
  const [formData, setFormData] = useState<WarehouseZone>({
    name: '',
    description: '',
    capacity: 0,
    zoneType: 'STORAGE',
    isActive: true
  })

  useEffect(() => {
    if (zone) {
      setFormData(zone)
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        capacity: 0,
        zoneType: 'STORAGE',
        isActive: true
      })
    }
  }, [zone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!warehouseId) return
    
    try {
      if (zone?.id) {
        await put(`/api/warehouses/${warehouseId}/zones/${zone.id}`, formData)
      } else {
        await post(`/api/warehouses/${warehouseId}/zones`, formData)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save warehouse zone:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {zone?.id ? 'Edit Zone' : 'Add New Zone'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., A-01"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Type *
                </label>
                <select
                  required
                  value={formData.zoneType}
                  onChange={(e) => setFormData({...formData, zoneType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="STORAGE">Storage</option>
                  <option value="PICKING">Picking</option>
                  <option value="PACKING">Packing</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="RECEIVING">Receiving</option>
                  <option value="QUARANTINE">Quarantine</option>
                  <option value="RETURNS">Returns</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (units) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
              />
              <label className="text-sm text-gray-700">Active Zone</label>
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
                {loading ? 'Saving...' : (zone?.id ? 'Update Zone' : 'Create Zone')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
