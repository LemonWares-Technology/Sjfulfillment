'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { PlusIcon, PencilIcon, TruckIcon, MapPinIcon, TrashIcon } from '@heroicons/react/24/outline'
import LogisticsPartnerModal from '@/app/components/logistics-partner-modal'

interface LogisticsPartner {
  id: string
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
  isActive: boolean
  createdAt: string
  deliveryMetrics: {
    id: string
    averageDeliveryTime: number
    onTimeDeliveryRate: number
    totalDeliveries: number
  }[]
  // Additional fields for creation/editing
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

export default function LogisticsPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const [logisticsPartners, setLogisticsPartners] = useState<LogisticsPartner[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('ALL')
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<LogisticsPartner | null>(null)

  useEffect(() => {
    fetchLogisticsPartners()
  }, [])

  const fetchLogisticsPartners = async () => {
    try {
      const response = await get<{ partners: LogisticsPartner[] }>('/api/logistics-partners', { silent: true })
      console.log('Logistics partners API response:', response)
      setLogisticsPartners(response?.partners || [])
    } catch (error) {
      console.error('Failed to fetch logistics partners:', error)
      setLogisticsPartners([])
    }
  }

  const handleAddPartner = () => {
    setEditingPartner(null)
    setShowPartnerModal(true)
  }

  const handleEditPartner = (partner: LogisticsPartner) => {
    setEditingPartner(partner)
    setShowPartnerModal(true)
  }

  const handleCloseModal = () => {
    setShowPartnerModal(false)
    setEditingPartner(null)
  }

  const handleSavePartner = (partnerData?: any) => {
    fetchLogisticsPartners()

    // Show success message with login credentials for new partners
    if (partnerData && !editingPartner) {
      alert(`Logistics partner created successfully!\n\nLogin Instructions:\nEmail: ${partnerData.email}\nPassword: ${partnerData.password}\n\nPlease share these credentials with the logistics partner. They can reset their password using "Forgot Password" on the login page.`)
    }
  }

  const filteredPartners = (logisticsPartners || []).filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.city.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesService = serviceFilter === 'ALL' || partner.serviceType === serviceFilter

    return matchesSearch && matchesService
  })

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'EXPRESS':
        return 'bg-red-100 text-red-800'
      case 'STANDARD':
        return 'bg-amber-100 text-amber-800'
      case 'ECONOMY':
        return 'bg-green-100 text-green-800'
      case 'SAME_DAY':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePartnerDelete = async (partnerId: string) => {
    try {

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/logistics-partners/${partnerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete logistics partner')
      }

      const data = await response.json();

      console.log(`Data:`, data);

      fetchLogisticsPartners();
    } catch (error) {
      console.warn(`Error:`, error);
    }
  }

  return (
    <DashboardLayout userRole={user?.role || 'SJFS_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Logistics Partners</h1>
              <p className="mt-2 text-white">
                Manage delivery and shipping partners
              </p>
            </div>
            {user?.role === 'SJFS_ADMIN' && (
              <button
                onClick={handleAddPartner}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Partner
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search logistics partners..."
                className="w-full px-3 py-2 border border-white/30 bg-transparent text-white placeholder-white/70 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sm:w-48">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-white/30 bg-transparent text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option className="text-black" value="ALL">All Services</option>
                <option className="text-black" value="EXPRESS">Express</option>
                <option className="text-black" value="STANDARD">Standard</option>
                <option className="text-black" value="ECONOMY">Economy</option>
                <option className="text-black" value="SAME_DAY">Same Day</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logistics Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="bg-white/30 shadow rounded-[5px] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-[5px] flex items-center justify-center">
                      <TruckIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-white">
                        {partner.name}
                      </h3>
                      <p className="text-sm text-white">
                        {partner.contactPerson}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(partner.serviceType)}`}>
                    {partner.serviceType}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-white">
                    <span className="font-medium w-20">Email:</span>
                    <span>{partner.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-white">
                    <span className="font-medium w-20">Phone:</span>
                    <span>{partner.phone}</span>
                  </div>
                  <div className="flex items-start text-sm text-white">
                    <MapPinIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{partner.address}, {partner.city}, {partner.state}</span>
                  </div>
                </div>

                {partner.deliveryMetrics.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-white mb-2">Performance</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/30 p-2 rounded-[5px]">
                        <div className="font-medium text-white">Avg. Delivery</div>
                        <div className="text-white">{partner.deliveryMetrics[0].averageDeliveryTime} days</div>
                      </div>
                      <div className="bg-white/30 p-2 rounded-[5px]">
                        <div className="font-medium text-white">On-Time Rate</div>
                        <div className="text-white">{partner.deliveryMetrics[0].onTimeDeliveryRate}%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${partner.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {partner.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {user?.role === 'SJFS_ADMIN' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditPartner(partner)}
                        className="text-white hover:text-amber-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePartnerDelete(partner.id)}
                        className="text-white hover:text-amber-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPartners.length === 0 && (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-[#f08c17]" />
            <h3 className="mt-2 text-sm font-medium text-white">No logistics partners found</h3>
            <p className="mt-1 text-sm text-white">
              {user?.role === 'SJFS_ADMIN'
                ? 'Get started by adding your first logistics partner.'
                : 'Logistics partners will appear here once they are added by administrators.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Logistics Partner Modal */}
      <LogisticsPartnerModal
        isOpen={showPartnerModal}
        onClose={handleCloseModal}
        partner={editingPartner}
        onSave={handleSavePartner}
      />
    </DashboardLayout>
  )
}
