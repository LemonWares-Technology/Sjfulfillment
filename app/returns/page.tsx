'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { EyeIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'
import Pagination from '@/app/components/pagination'
import ServiceGate from '@/app/components/service-gate'
import LoadingSpinner from '@/app/components/loading-spinner'

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

interface OrderSummary {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
}

export default function ReturnsPage() {
  const { user } = useAuth()
  const { get, post, put, loading } = useApi()
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Create Return modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderResults, setOrderResults] = useState<OrderSummary[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [restockable, setRestockable] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReturns()
  }, [currentPage, statusFilter])

  const fetchReturns = async () => {
    try {
      setIsLoadingData(true)
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
    } finally {
      setIsLoadingData(false)
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

  const searchOrders = async () => {
    if (!orderSearch.trim()) {
      setOrderResults([])
      return
    }
    try {
      const data = await get<{ orders: OrderSummary[]; pagination: any }>(`/api/orders?search=${encodeURIComponent(orderSearch)}&limit=5`, { silent: true })
      setOrderResults(Array.isArray(data?.orders) ? data.orders : [])
    } catch (error) {
      console.error('Failed to search orders:', error)
      setOrderResults([])
    }
  }

  const resetCreateForm = () => {
    setOrderSearch('')
    setOrderResults([])
    setSelectedOrder(null)
    setReason('')
    setDescription('')
    setRefundAmount('')
    setRestockable(false)
    setSubmitting(false)
  }

  const handleCreateReturn = async () => {
    if (!selectedOrder || !reason) {
      toast.error('Select an order and reason')
      return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        orderId: selectedOrder.id,
        reason,
        description: description.trim() || undefined,
        restockable,
      }
      const amt = parseFloat(refundAmount)
      if (!isNaN(amt) && amt > 0) {
        payload.refundAmount = amt
      }
  // Create return request
  await post('/api/returns', payload)
      toast.success('Return request created')
      setIsCreateOpen(false)
      resetCreateForm()
      fetchReturns()
    } catch (error) {
      console.error('Failed to create return:', error)
      // error toast handled in useApi; keep UX consistent
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PROCESSED':
        return 'bg-blue-100 text-blue-800'
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
      <ServiceGate 
        serviceName="Returns Management"
        mode="block"
        fallbackMessage={`Subscribe to "Returns Management" to access and process customer return requests.`}
      >
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#f08c17]">Returns Management</h1>
                <p className="mt-2 text-white/90">
                  Process customer return requests and refunds
                </p>
              </div>
              <div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center bg-[#f08c17] hover:bg-orange-500 text-white font-medium py-2 px-4 rounded-[5px] shadow-md"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Return Request
                </button>
              </div>
            </div>
          </div>

        {/* Create Return Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setIsCreateOpen(false); resetCreateForm() }}></div>
            <div className="relative bg-white rounded-[8px] shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Return Request</h3>
                <button onClick={() => { setIsCreateOpen(false); resetCreateForm() }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Order search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order number, customer name, email, or phone"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button onClick={searchOrders} className="bg-gray-800 text-white px-3 py-2 rounded-[6px]">Search</button>
                </div>

                {/* Results */}
                {selectedOrder ? (
                  <div className="mt-3 p-3 rounded-md bg-green-50 border border-green-200">
                    <div className="text-sm text-green-800 font-medium">Selected: {selectedOrder.orderNumber}</div>
                    <div className="text-xs text-green-700">{selectedOrder.customerName} • {formatCurrency(selectedOrder.totalAmount)}</div>
                    <button className="mt-2 text-xs text-green-700 underline" onClick={() => setSelectedOrder(null)}>Change</button>
                  </div>
                ) : (
                  orderResults.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-gray-200 divide-y">
                      {orderResults.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        >
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-900">{o.orderNumber}</span>
                            <span className="text-gray-700">{formatCurrency(o.totalAmount)}</span>
                          </div>
                          <div className="text-xs text-gray-600">{o.customerName}</div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Reason */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select reason</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="WRONG_ITEM">Wrong item</option>
                  <option value="CUSTOMER_REJECTED">Customer rejected</option>
                  <option value="NO_MONEY">No money</option>
                  <option value="QUALITY_ISSUE">Quality issue</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Add any notes about the return request..."
                />
              </div>

              {/* Refund amount + Restockable */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={restockable}
                      onChange={(e) => setRestockable(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Restockable
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setIsCreateOpen(false); resetCreateForm() }}
                  className="px-4 py-2 rounded-[6px] border border-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReturn}
                  disabled={submitting}
                  className="px-4 py-2 rounded-[6px] bg-[#f08c17] hover:bg-orange-500 text-white disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Return'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  { value: 'PROCESSED', label: 'Processed' }
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
            {isLoadingData ? (
              <LoadingSpinner text="Loading returns..." size="lg" className="py-12" />
            ) : (
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
                        —
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
                          <Link href={`/returns/${returnItem.id}`} className="text-[#f08c17] hover:text-orange-400 bg-white/20 rounded-full p-1 transition-colors" title="View Details">
                            <EyeIcon className="h-4 w-4" />
                          </Link>
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
            )}
            
            {!isLoadingData && filteredReturns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/90">No return requests found</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {!isLoadingData && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
        )}
        </div>
      </ServiceGate>
    </DashboardLayout>
  )
}
