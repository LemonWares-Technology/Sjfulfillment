'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'
import Pagination from '@/app/components/pagination'

interface ReturnRequest {
  id: string
  reason: string
  description?: string
  status: string
  refundAmount?: number
  approvedAmount?: number
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  processedAt?: string
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    totalAmount: number
    status: string
    merchant: {
      id: string
      businessName: string
    }
  }
  requestedByUser: {
    firstName: string
    lastName: string
    email: string
  }
  processedByUser?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function ReturnsPage() {
  const { user } = useAuth()
  const { get, put, loading } = useApi()
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchReturns()
  }, [currentPage, statusFilter])

  const fetchReturns = async () => {
    try {
      console.log('Fetching returns for user:', user?.role, user?.merchantId)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      })
      
      const response = await get<{returns: ReturnRequest[], pagination: any}>(`/api/returns?${params}`, { silent: true })
      console.log('Returns API response:', response)
      console.log('Returns count:', response?.returns?.length || 0)
      
      if (response?.returns) {
        setReturns(Array.isArray(response.returns) ? response.returns : [])
        setTotalPages(response.pagination?.pages || 1)
        setTotalItems(response.pagination?.total || 0)
      } else {
        setReturns([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
      setReturns([])
      setTotalPages(1)
      setTotalItems(0)
    }
  }

  const handleProcessReturn = async (returnId: string, status: string) => {
    try {
      await put(`/api/returns/${returnId}`, { status })
      fetchReturns()
    } catch (error) {
      console.error('Failed to process return:', error)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredReturns = (returns || []).filter(returnItem => {
    const matchesSearch = (returnItem.order?.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (returnItem.order?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (returnItem.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || returnItem.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Returns Management</h1>
              <p className="mt-2 text-white/90">
                Process customer return requests and refunds
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search returns by reason, order, or customer..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'PROCESSED', label: 'Processed' },
                  { value: 'RESTOCKED', label: 'Restocked' }
                ]}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                placeholder="All Status"
                className="bg-white/20 text-white/90 border-none rounded-[5px]"
              />
            </div>
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white/30 shadow-lg backdrop-blur-md overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/30">
                <thead className="bg-gradient-to-r from-[#f08c17] to-orange-400">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Return
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Refund Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/10 divide-y divide-white/20">
                  {filteredReturns.map((returnItem) => (
                    <tr key={returnItem.id} className="hover:bg-white/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-white/90">
                            {returnItem.reason}
                          </div>
                          <div className="text-sm text-white/70">
                            {returnItem.description || 'No description'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                        {returnItem.order?.orderNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-white/90">
                            {returnItem.order?.customerName || 'N/A'}
                          </div>
                          <div className="text-sm text-white/70">
                            {returnItem.order?.customerEmail || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                        Return items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white/90">
                        {formatCurrency(returnItem.approvedAmount || returnItem.refundAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.status)} bg-white/20 text-[#f08c17]`}> 
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                        {formatDate(returnItem.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-[#f08c17] hover:text-orange-400 bg-white/20 rounded-full p-1 transition-colors" title="View Details">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {returnItem.status === 'PENDING' && (user?.role === 'SJFS_ADMIN' || user?.role === 'WAREHOUSE_STAFF') && (
                            <>
                              <button
                                onClick={() => handleProcessReturn(returnItem.id, 'APPROVED')}
                                className="text-green-400 hover:text-green-300 bg-white/20 rounded-full p-1"
                                title="Approve Return"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProcessReturn(returnItem.id, 'REJECTED')}
                                className="text-red-400 hover:text-red-300 bg-white/20 rounded-full p-1"
                                title="Reject Return"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {returnItem.status === 'APPROVED' && (user?.role === 'SJFS_ADMIN' || user?.role === 'WAREHOUSE_STAFF') && (
                            <button
                              onClick={() => handleProcessReturn(returnItem.id, 'PROCESSED')}
                              className="text-purple-400 hover:text-purple-300 bg-white/20 rounded-full p-1"
                              title="Mark as Processed"
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredReturns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/90">No return requests found</p>
              </div>
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
    </DashboardLayout>
  )
}
