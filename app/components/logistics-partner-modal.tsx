'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface LogisticsPartner {
  id?: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  serviceType: string
  coverageArea: string[]
  isActive?: boolean
  createdAt?: string
  deliveryMetrics?: {
    id: string
    averageDeliveryTime: number
    onTimeDeliveryRate: number
    totalDeliveries: number
  }[]
  // Additional fields for creation
  companyName?: string
  cacNumber?: string
  coverageAreas?: string[]
  password?: string
  guarantors?: {
    name: string
    phone: string
    address: string
    relationship: string
  }
  documents?: {
    cacCertificate?: string
    insuranceCertificate?: string
    bankStatement?: string
  }
}

interface LogisticsPartnerModalProps {
  isOpen: boolean
  onClose: () => void
  partner?: LogisticsPartner | null
  onSave: (partnerData?: LogisticsPartner) => void
}

export default function LogisticsPartnerModal({ isOpen, onClose, partner, onSave }: LogisticsPartnerModalProps) {
  const { post, put, loading } = useApi()
  const [formData, setFormData] = useState<LogisticsPartner>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    serviceType: 'STANDARD',
    coverageArea: [],
    companyName: '',
    cacNumber: '',
    coverageAreas: [],
    password: '',
    guarantors: {
      name: '',
      phone: '',
      address: '',
      relationship: ''
    }
  })

  const [coverageAreaInput, setCoverageAreaInput] = useState('')

  useEffect(() => {
    if (partner) {
      setFormData({
        ...partner,
        coverageArea: partner.coverageArea || [],
        coverageAreas: partner.coverageAreas || [],
        guarantors: partner.guarantors || {
          name: '',
          phone: '',
          address: '',
          relationship: ''
        }
      })
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        serviceType: 'STANDARD',
        coverageArea: [],
        companyName: '',
        cacNumber: '',
        coverageAreas: [],
        password: '',
        guarantors: {
          name: '',
          phone: '',
          address: '',
          relationship: ''
        }
      })
    }
  }, [partner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate required fields
      if (!formData.companyName || !formData.contactPerson || !formData.email || 
          !formData.phone || !formData.address || !formData.city || !formData.state || 
          !formData.cacNumber || !formData.coverageAreas || formData.coverageAreas.length === 0 ||
          !formData.guarantors || !formData.guarantors.name || !formData.guarantors.phone || 
          !formData.guarantors.address || !formData.guarantors.relationship ||
          (!partner?.id && !formData.password)) {
        alert('Please fill in all required fields')
        return
      }

      if (partner?.id) {
        await put(`/api/logistics-partners/${partner.id}`, formData)
        onSave()
      } else {
        await post('/api/logistics-partners', formData)
        onSave(formData) // Pass form data for new partners to show credentials
      }
      onClose()
    } catch (error) {
      console.error('Failed to save logistics partner:', error)
      alert('Failed to save logistics partner. Please check the console for details.')
    }
  }

  const addCoverageArea = () => {
    if (coverageAreaInput.trim() && formData.coverageAreas && !formData.coverageAreas.includes(coverageAreaInput.trim())) {
      setFormData(prev => ({
        ...prev,
        coverageAreas: [...(prev.coverageAreas || []), coverageAreaInput.trim()]
      }))
      setCoverageAreaInput('')
    }
  }

  const removeCoverageArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      coverageAreas: (prev.coverageAreas || []).filter(a => a !== area)
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {partner?.id ? 'Edit Logistics Partner' : 'Add New Logistics Partner'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CAC Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cacNumber}
                    onChange={(e) => setFormData({...formData, cacNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {!partner?.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Set login password"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Logistics partner will use this password to log in. They can reset it using "Forgot Password" on the login page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Coverage Areas */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Coverage Areas</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add coverage area (e.g., Lagos, Abuja)"
                  value={coverageAreaInput}
                  onChange={(e) => setCoverageAreaInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoverageArea())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={addCoverageArea}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-md hover:from-amber-600 hover:to-yellow-700"
                >
                  Add
                </button>
              </div>
              {formData.coverageAreas && formData.coverageAreas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.coverageAreas.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeCoverageArea(area)}
                        className="ml-2 text-amber-600 hover:text-amber-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Guarantor Information */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Guarantor Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guarantor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guarantors.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      guarantors: { ...formData.guarantors, name: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guarantor Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.guarantors.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      guarantors: { ...formData.guarantors, phone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guarantor Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guarantors.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      guarantors: { ...formData.guarantors, address: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Business Partner, Family Member"
                    value={formData.guarantors.relationship}
                    onChange={(e) => setFormData({
                      ...formData,
                      guarantors: { ...formData.guarantors, relationship: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
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
                {loading ? 'Saving...' : (partner?.id ? 'Update Partner' : 'Create Partner')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
