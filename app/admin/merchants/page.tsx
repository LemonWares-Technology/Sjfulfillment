'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { PlusIcon, PencilIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import MerchantModal from '@/app/components/merchant-modal'
import MerchantSummaryModal from '@/app/components/merchant-summary-modal'
import { useRouter } from 'next/navigation'
import Pagination from '@/app/components/pagination'

interface Merchant {
  id: string
  businessName: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  address: string
  city: string
  state: string
  country: string
  cacNumber: string
  businessType: string
  onboardingStatus: string
  subscriptionStatus: string
  isActive: boolean
  createdAt: string
  users: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isActive: boolean
  }[]
  merchantServiceSubscriptions: {
    id: string
    status: string
    service: {
      id: string
      name: string
      price: number
    }
  }[]
  _count: {
    products: number
    orders: number
  }
  accumulatedCharges?: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
}

export default function MerchantsPage() {
  const { get, loading } = useApi()
  const router = useRouter()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showMerchantModal, setShowMerchantModal] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchMerchants()
  }, [currentPage])

  const fetchMerchants = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      const response = await get<{merchants: Merchant[], pagination: any}>(`/api/merchants?${params}`)
      
      if (response?.merchants) {
        setMerchants(Array.isArray(response.merchants) ? response.merchants : [])
        setTotalPages(response.pagination?.pages || 1)
        setTotalItems(response.pagination?.total || 0)
      } else {
        setMerchants([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error)
      setMerchants([])
      setTotalPages(1)
      setTotalItems(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredMerchants = merchants.filter(merchant =>
    merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate total accumulated charges across all merchants
  const totalAccumulatedCharges = merchants.reduce((sum, merchant) => {
    return sum + (merchant.accumulatedCharges?.total || 0)
  }, 0)

  const totalPaidCharges = merchants.reduce((sum, merchant) => {
    return sum + (merchant.accumulatedCharges?.paid || 0)
  }, 0)

  const totalPendingCharges = merchants.reduce((sum, merchant) => {
    return sum + (merchant.accumulatedCharges?.pending || 0)
  }, 0)

  const totalOverdueCharges = merchants.reduce((sum, merchant) => {
    return sum + (merchant.accumulatedCharges?.overdue || 0)
  }, 0)

  const handleAddMerchant = () => {
    setEditingMerchant(null)
    setShowMerchantModal(true)
  }

  const handleEditMerchant = (merchant: Merchant) => {
    setEditingMerchant(merchant)
    setShowMerchantModal(true)
  }

  const handleViewSummary = (merchantId: string) => {
    setSelectedMerchantId(merchantId)
    setShowSummaryModal(true)
  }

  const handleCloseModal = () => {
    setShowMerchantModal(false)
    setEditingMerchant(null)
  }

  const handleSaveMerchant = () => {
    fetchMerchants()
  }

  const handleViewMerchant = (merchantId: string) => {
    router.push(`/admin/merchants/${merchantId}`)
  }

  return (
    <DashboardLayout userRole="SJFS_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Merchants</h1>
              <p className="mt-2 text-white">
                Manage all merchants on the platform
              </p>
            </div>
            <button 
              onClick={handleAddMerchant}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Merchant
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-[5px] bg-gradient-to-r from-amber-500 to-yellow-600 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Total Charges
                  </dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrency(totalAccumulatedCharges)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-[5px] bg-green-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Paid Charges
                  </dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrency(totalPaidCharges)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-[5px] bg-yellow-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Pending Charges
                  </dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrency(totalPendingCharges)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/30 rounded-[5px] shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-[5px] bg-red-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white truncate">
                    Overdue Charges
                  </dt>
                  <dd className="text-lg font-semibold text-white">
                    {formatCurrency(totalOverdueCharges)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search merchants..."
              className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Merchants Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Onboarding Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Accumulated Charges
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className=" divide-y divide-gray-200">
                    {filteredMerchants.map((merchant) => (
                    <tr key={merchant.id} className="">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {merchant.businessName}
                          </div>
                          <div className="text-sm text-white">
                            {merchant.address}, {merchant.city}, {merchant.state}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-white">
                            {merchant.businessEmail}
                          </div>
                          <div className="text-sm text-white">
                            {merchant.businessPhone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(merchant.onboardingStatus)}`}>
                          {merchant.onboardingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          merchant.merchantServiceSubscriptions.length > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {merchant.merchantServiceSubscriptions.length > 0 ? 'ACTIVE' : 'NO SUBSCRIPTION'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {formatCurrency(merchant.accumulatedCharges?.total || 0)}
                          </div>
                          <div className="text-xs text-white">
                            <span className="text-green-600">Paid: {formatCurrency(merchant.accumulatedCharges?.paid || 0)}</span>
                            {merchant.accumulatedCharges?.pending ? (
                              <span className="ml-2 text-yellow-600">Pending: {formatCurrency(merchant.accumulatedCharges.pending)}</span>
                            ) : null}
                            {merchant.accumulatedCharges?.overdue ? (
                              <span className="ml-2 text-red-600">Overdue: {formatCurrency(merchant.accumulatedCharges.overdue)}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {merchant.users.length} users
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(merchant.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewMerchant(merchant.id)}
                            className="text-white hover:text-amber-900"
                            title="View Merchant Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleViewSummary(merchant.id)}
                            className="text-white hover:text-blue-900"
                            title="View Business Summary"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleEditMerchant(merchant)}
                            className="text-white hover:text-amber-900"
                            title="Edit Merchant"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
                {filteredMerchants.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No merchants found</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Merchant Modal */}
      <MerchantModal
        isOpen={showMerchantModal}
        onClose={handleCloseModal}
        merchant={editingMerchant}
        onSave={handleSaveMerchant}
      />

      {/* Merchant Summary Modal */}
      <MerchantSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        merchantId={selectedMerchantId}
      />
    </DashboardLayout>
  )
}
