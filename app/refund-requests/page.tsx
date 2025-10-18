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

interface RefundRequest {
  id: string
  orderId: string
  reason: string
  description?: string
  requestedAmount: number
  status: string
  approvedAmount?: number
  rejectionReason?: string
  createdAt: string
  processedAt?: string
  order: {
    orderNumber: string
    customerName: string
    totalAmount: number
    status: string
    merchant: {
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

export default function RefundRequestsPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchRefundRequests()
  }, [currentPage, statusFilter])

  const fetchRefundRequests = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }

      console.log('Fetching refund requests with params:', params.toString())
      const response = await get(`/api/refund-requests?${params.toString()}`, { silent: true })
      console.log('Refund requests API response:', response)
      
      if (response?.refundRequests) {
        setRefundRequests(Array.isArray(response.refundRequests) ? response.refundRequests : [])
        setTotalPages(response.pagination?.pages || 1)
        setTotalItems(response.pagination?.total || 0)
      } else {
        setRefundRequests([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Error fetching refund requests:', error)
      // Set empty state on error to prevent UI issues
      setRefundRequests([])
      setTotalPages(1)
      setTotalItems(0)
    }
  }

  const handleApproveRefund = async (refundId: string, approvedAmount: number) => {
    try {
      const response = await fetch(`/api/refund-requests/${refundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'APPROVED',
          approvedAmount: approvedAmount
        })
      })

      if (response.ok) {
        fetchRefundRequests()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to approve refund request')
      }
    } catch (error) {
      console.error('Error approving refund:', error)
      alert('An error occurred while approving the refund')
    }
  }

  const handleRejectRefund = async (refundId: string, rejectionReason: string) => {
    try {
      const response = await fetch(`/api/refund-requests/${refundId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason
        })
      })

      if (response.ok) {
        fetchRefundRequests()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to reject refund request')
      }
    } catch (error) {
      console.error('Error rejecting refund:', error)
      alert('An error occurred while rejecting the refund')
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

  const getReasonLabel = (reason: string) => {
    const reasonMap: Record<string, string> = {
      'ORDER_CANCELLED': 'Order Cancelled',
      'PRODUCT_DEFECTIVE': 'Product Defective',
      'WRONG_ITEM_SENT': 'Wrong Item Sent',
      'DELIVERY_DELAYED': 'Delivery Delayed',
      'CUSTOMER_REJECTED': 'Customer Rejected',
      'PAYMENT_ISSUE': 'Payment Issue',
      'OTHER': 'Other'
    }
    return reasonMap[reason] || reason
  }

  const filteredRefundRequests = refundRequests.filter(request =>
    request.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.order.merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requestedByUser.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requestedByUser.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (user?.role !== 'SJFS_ADMIN' && user?.role !== 'WAREHOUSE_STAFF') {
    return (
      <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role || 'SJFS_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#f08c17]">Refund Requests</h1>
          <p className="mt-2 text-white">
            {user?.role === 'SJFS_ADMIN' 
              ? 'Manage and process refund requests from merchants' 
              : 'Review and process refund requests from merchants'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by order number, customer, merchant, or requester..."
            />
          </div>
          <div className="w-full sm:w-48">
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'PROCESSED', label: 'Processed' }
              ]}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/30 p-4 rounded-[5px] shadow">
            <div className="text-2xl font-bold text-yellow-600">
              {refundRequests.filter(r => r.status === 'PENDING').length}
            </div>
            <div className="text-sm text-white">Pending</div>
          </div>
          <div className="bg-white/30 p-4 rounded-[5px] shadow">
            <div className="text-2xl font-bold text-green-600">
              {refundRequests.filter(r => r.status === 'APPROVED').length}
            </div>
            <div className="text-sm text-white">Approved</div>
          </div>
          <div className="bg-white/30 p-4 rounded-[5px] shadow">
            <div className="text-2xl font-bold text-red-600">
              {refundRequests.filter(r => r.status === 'REJECTED').length}
            </div>
            <div className="text-sm text-white">Rejected</div>
          </div>
          <div className="bg-white/30 p-4 rounded-[5px] shadow">
            <div className="text-2xl font-bold text-blue-600">
              {refundRequests.filter(r => r.status === 'PROCESSED').length}
            </div>
            <div className="text-sm text-white">Processed</div>
          </div>
        </div>

        {/* Refund Requests Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08c17] mx-auto"></div>
              <p className="mt-2 text-white">Loading refund requests...</p>
            </div>
          ) : filteredRefundRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white">No refund requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Merchant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f08c17] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/10 divide-y divide-white/20">
                  {filteredRefundRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-[#f08c17]/10">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {request.order.orderNumber}
                          </div>
                          <div className="text-sm text-white/70">
                            {request.order.customerName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {request.order.merchant.businessName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {request.requestedByUser.firstName} {request.requestedByUser.lastName}
                          </div>
                          <div className="text-sm text-white/70">
                            {request.requestedByUser.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-white">
                            {getReasonLabel(request.reason)}
                          </div>
                          {request.description && (
                            <div className="text-sm text-white/70 truncate max-w-xs">
                              {request.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            ₦{formatCurrency(request.requestedAmount)}
                          </div>
                          {request.approvedAmount && (
                            <div className="text-sm text-green-300">
                              Approved: ₦{formatCurrency(request.approvedAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {request.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => {
                                  const approvedAmount = prompt('Enter approved amount:', request.requestedAmount.toString())
                                  if (approvedAmount && !isNaN(parseFloat(approvedAmount))) {
                                    handleApproveRefund(request.id, parseFloat(approvedAmount))
                                  }
                                }}
                                className="text-green-300 hover:text-green-500"
                                title="Approve Refund"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:')
                                  if (reason) {
                                    handleRejectRefund(request.id, reason)
                                  }
                                }}
                                className="text-red-300 hover:text-red-500"
                                title="Reject Refund"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  )
}
