'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface Warehouse {
  id?: string
  name: string
  code?: string
  address?: string
  city?: string
  state?: string
  country?: string
  capacity: number
  managerId?: string
  isActive: boolean
  isAddressRequired: boolean
  merchantVisible: boolean
}

interface WarehouseModalProps {
  isOpen: boolean
  onClose: () => void
  warehouse?: Warehouse | null
  onSave: () => void
}

export default function WarehouseModal({ isOpen, onClose, warehouse, onSave }: WarehouseModalProps) {
  const { post, put, loading } = useApi()
  const [formData, setFormData] = useState<Warehouse>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    capacity: 0,
    managerId: '',
    isActive: true,
    isAddressRequired: false,
    merchantVisible: true
  })

  useEffect(() => {
    if (warehouse) {
      setFormData(warehouse)
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        capacity: 0,
        managerId: '',
        isActive: true,
        isAddressRequired: false,
        merchantVisible: true
      })
    }
  }, [warehouse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Clean up form data - ensure required fields are provided
      const cleanedData = {
        ...formData,
        address: formData.address?.trim() || 'Not specified',
        city: formData.city?.trim() || 'Lagos', // Default to Lagos if empty
        state: formData.state?.trim() || 'Lagos', // Default to Lagos if empty
        managerId: formData.managerId?.trim() || undefined,
      }
      
      if (warehouse?.id) {
        await put(`/api/warehouses/${warehouse.id}`, cleanedData)
      } else {
        await post('/api/warehouses', cleanedData)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save warehouse:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {warehouse?.id ? 'Edit Warehouse' : 'Add New Warehouse'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Address Section - Optional */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addressRequired"
                    checked={formData.isAddressRequired}
                    onChange={(e) => setFormData({...formData, isAddressRequired: e.target.checked})}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label htmlFor="addressRequired" className="ml-2 text-sm text-gray-600">
                    Address Required
                  </label>
                </div>
              </div>
              <textarea
                rows={3}
                required={formData.isAddressRequired}
                value={formData.address || ''}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={formData.isAddressRequired ? "Enter warehouse address..." : "Address (optional)..."}
              />
              {!formData.isAddressRequired && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 You can create warehouses without addresses for virtual/logical warehouses
                </p>
              )}
            </div>

            {/* Location Fields - Only show if address is required */}
            {formData.isAddressRequired && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required={formData.isAddressRequired}
                    value={formData.city || ''}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <select
                    required={formData.isAddressRequired}
                    value={formData.state || ''}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                  <option value="">Select State</option>
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Kano">Kano</option>
                  <option value="Rivers">Rivers</option>
                  <option value="Ogun">Ogun</option>
                  <option value="Oyo">Oyo</option>
                  <option value="Kaduna">Kaduna</option>
                  <option value="Enugu">Enugu</option>
                  <option value="Delta">Delta</option>
                  <option value="Imo">Imo</option>
                  <option value="Anambra">Anambra</option>
                  <option value="Akwa Ibom">Akwa Ibom</option>
                  <option value="Bayelsa">Bayelsa</option>
                  <option value="Cross River">Cross River</option>
                  <option value="Edo">Edo</option>
                  <option value="Ekiti">Ekiti</option>
                  <option value="Osun">Osun</option>
                  <option value="Ondo">Ondo</option>
                  <option value="Kwara">Kwara</option>
                  <option value="Benue">Benue</option>
                  <option value="Plateau">Plateau</option>
                  <option value="Niger">Niger</option>
                  <option value="Sokoto">Sokoto</option>
                  <option value="Kebbi">Kebbi</option>
                  <option value="Zamfara">Zamfara</option>
                  <option value="Katsina">Katsina</option>
                  <option value="Jigawa">Jigawa</option>
                  <option value="Yobe">Yobe</option>
                  <option value="Borno">Borno</option>
                  <option value="Adamawa">Adamawa</option>
                  <option value="Taraba">Taraba</option>
                  <option value="Bauchi">Bauchi</option>
                  <option value="Gombe">Gombe</option>
                  <option value="Nasarawa">Nasarawa</option>
                  <option value="FCT">FCT</option>
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Merchant Visibility Control */}
            <div className="bg-blue-50 border border-blue-200 rounded-[5px] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Merchant Visibility</h3>
                  <p className="text-sm text-blue-700">
                    Control whether merchants can see this warehouse address
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="merchantVisible"
                    checked={formData.merchantVisible}
                    onChange={(e) => setFormData({...formData, merchantVisible: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="merchantVisible" className="ml-2 text-sm text-blue-700">
                    {formData.merchantVisible ? 'Visible to Merchants' : 'Hidden from Merchants'}
                  </label>
                </div>
              </div>
              {!formData.merchantVisible && (
                <p className="text-xs text-blue-600 mt-2">
                  🔒 This warehouse address will be hidden from merchants for security/privacy
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    <strong>Auto-Generated Code:</strong> Warehouse code will be automatically generated based on city location (e.g., WH-LA-01 for Lagos).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
              />
              <label className="text-sm text-gray-700">Active Warehouse</label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[5px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-[5px] disabled:opacity-50"
              >
                {loading ? 'Saving...' : (warehouse?.id ? 'Update Warehouse' : 'Create Warehouse')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
