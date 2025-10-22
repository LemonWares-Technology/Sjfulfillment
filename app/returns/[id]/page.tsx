'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/app/lib/utils'
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

interface ReturnRequest {
  id: string
  reason: string
  status: string
  createdAt: string
  processedAt?: string | null
  refundAmount?: number | null
  approvedAmount?: number | null
  rejectionReason?: string | null
  description?: string | null
  restockable: boolean
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    totalAmount: number
    status: string
    createdAt?: string
  }
  requestedByUser?: {
    firstName: string
    lastName: string
    email: string
  } | null
  processedByUser?: {
    firstName: string
    lastName: string
    email: string
  } | null
}

const RETURN_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckIcon },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XMarkIcon },
  { value: 'PROCESSED', label: 'Processed', color: 'bg-blue-100 text-blue-800', icon: TruckIcon }
]

export default function ReturnDetailsPage() {
  const { user } = useAuth()
  const { get, put, loading } = useApi()
  const router = useRouter()
  const params = useParams()
  const returnId = params?.id as string

  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (returnId) {
      fetchReturnRequest()
    }
  }, [returnId])

  const fetchReturnRequest = async () => {
    try {
  const data = await get<ReturnRequest>(`/api/returns/${returnId}`)
      setReturnRequest(data)
      setSelectedStatus(data.status)
    } catch (error) {
      console.error('Failed to fetch return request:', error)
      toast.error('Failed to load return request details')
      router.push('/returns')
    }
  }

  const handleStatusUpdate = async () => {
    if (!returnRequest || !selectedStatus) return

    setIsUpdating(true)
    try {
      const payload: any = { status: selectedStatus }
      if (selectedStatus === 'APPROVED') {
        const amt = parseFloat(statusNotes)
        if (!isNaN(amt) && amt > 0) payload.approvedAmount = amt
      }
      if (selectedStatus === 'REJECTED' && statusNotes.trim()) {
        payload.rejectionReason = statusNotes.trim()
      }

      await put(`/api/returns/${returnId}`, payload)
      
      toast.success('Return status updated successfully')
      fetchReturnRequest() // Refresh data
    } catch (error) {
      console.error('Failed to update return status:', error)
      toast.error('Failed to update return status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getNextStatuses = (currentStatus: string) => {
    // Allowed transitions:
    // PENDING -> APPROVED or REJECTED
    // APPROVED -> PROCESSED
    // REJECTED/PROCESSED -> no further action
    if (currentStatus === 'PENDING') return RETURN_STATUSES.filter(s => ['PENDING','APPROVED','REJECTED'].includes(s.value))
    if (currentStatus === 'APPROVED') return RETURN_STATUSES.filter(s => ['APPROVED','PROCESSED'].includes(s.value))
    return RETURN_STATUSES.filter(s => s.value === currentStatus)
  }

  const getStatusInfo = (status: string) => {
    return RETURN_STATUSES.find(s => s.value === status) || RETURN_STATUSES[0]
  }

  if (!returnRequest) {
    return (
      <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17] mx-auto mb-4"></div>
            <p className="text-white/90">Loading return request details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const statusInfo = getStatusInfo(returnRequest.status)

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/returns')}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-[#f08c17]">Return Request Details</h1>
                <p className="mt-2 text-white/90">Order #{returnRequest.order.orderNumber}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Return Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#f08c17]">Return Status</h2>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusInfo.color}`}>
                  <statusInfo.icon className="h-4 w-4 mr-2" />
                  {statusInfo.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-white/70">Requested At</label>
                  <p className="mt-1 text-sm text-white/90">{formatDate(returnRequest.createdAt)}</p>
                </div>
                {returnRequest.processedAt && (
                  <div>
                    <label className="block text-sm font-medium text-white/70">Processed At</label>
                    <p className="mt-1 text-sm text-white/90">{formatDate(returnRequest.processedAt)}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-white/70">Refund Amount</label>
                  <p className="mt-1 text-sm font-semibold text-[#f08c17]">{formatCurrency(returnRequest.approvedAmount || returnRequest.refundAmount || 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70">Return Reason</label>
                  <p className="mt-1 text-sm text-white/90">{returnRequest.reason}</p>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
              <h2 className="text-lg font-semibold text-[#f08c17] mb-4">Order Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-white/70">Order Number</label>
                  <p className="mt-1 text-sm text-white/90">{returnRequest.order.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70">Order Date</label>
                  <p className="mt-1 text-sm text-white/90">{formatDate(returnRequest.order.createdAt || returnRequest.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70">Customer Name</label>
                  <p className="mt-1 text-sm text-white/90">{returnRequest.order.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70">Customer Email</label>
                  <p className="mt-1 text-sm text-white/90">{returnRequest.order.customerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70">Order Total</label>
                  <p className="mt-1 text-sm text-white/90">{formatCurrency(returnRequest.order.totalAmount)}</p>
                </div>
              </div>
            </div>
            {/* Description / Rejection Reason */}
            {(returnRequest.description || returnRequest.rejectionReason) && (
              <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
                <h2 className="text-lg font-semibold text-[#f08c17] mb-4">Notes</h2>
                {returnRequest.description && (
                  <p className="text-sm text-white/90 mb-2">{returnRequest.description}</p>
                )}
                {returnRequest.rejectionReason && (
                  <p className="text-sm text-red-400">Rejection Reason: {returnRequest.rejectionReason}</p>
                )}
              </div>
            )}
          </div>

          {/* Return Processing */}
          <div className="space-y-6">
            {/* Update Status */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
              <h2 className="text-lg font-semibold text-[#f08c17] mb-4">Update Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                  >
                    {getNextStatuses(returnRequest.status).map((status) => (
                      <option key={status.value} value={status.value} className="bg-gray-800 text-white">
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedStatus === 'APPROVED' || selectedStatus === 'REJECTED') && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {selectedStatus === 'APPROVED' ? 'Approved Amount' : 'Rejection Reason'}
                    </label>
                    {selectedStatus === 'APPROVED' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                        placeholder="Enter approved amount"
                      />
                    ) : (
                      <textarea
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                        placeholder="Enter rejection reason"
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === returnRequest.status}
                  className="w-full bg-[#f08c17] hover:bg-orange-500 text-white px-4 py-2 rounded-[5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {/* Return Summary */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
              <h2 className="text-lg font-semibold text-[#f08c17] mb-4">Return Summary</h2>
              <div className="space-y-3">
                <div className="border-t border-white/20 pt-3 flex justify-between font-medium">
                  <span className="text-white/90">Refund Amount:</span>
                  <span className="text-[#f08c17]">{formatCurrency(returnRequest.approvedAmount || returnRequest.refundAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Restockable:</span>
                  <span className="text-white/90">{returnRequest.restockable ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px] p-6">
              <h2 className="text-lg font-semibold text-[#f08c17] mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {returnRequest.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedStatus('APPROVED')
                        setStatusNotes('')
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] font-medium transition-colors shadow-md"
                    >
                      Approve Return
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatus('REJECTED')
                        setStatusNotes('')
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-[5px] font-medium transition-colors shadow-md"
                    >
                      Reject Return
                    </button>
                  </>
                )}
                {returnRequest.status === 'APPROVED' && (
                  <button
                    onClick={() => {
                      setSelectedStatus('PROCESSED')
                      setStatusNotes('')
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-[5px] font-medium transition-colors shadow-md"
                  >
                    Mark as Processed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

