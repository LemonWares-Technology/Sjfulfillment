'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ReturnItem {
  id: string
  quantity: number
  reason: string
  condition: string
  orderItem: {
    id: string
    quantity: number
    product: {
      id: string
      name: string
      sku: string
      images: string[]
      unitPrice: number
    }
  }
}

interface ReturnRequest {
  id: string
  returnNumber: string
  reason: string
  status: string
  requestedAt: string
  processedAt: string | null
  refundAmount: number
  notes: string
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    customerPhone: string
    totalAmount: number
    status: string
    createdAt: string
  }
  returnItems: ReturnItem[]
  statusHistory: {
    status: string
    timestamp: string
    notes?: string
  }[]
}

const RETURN_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckIcon },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XMarkIcon },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: TruckIcon },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-purple-100 text-purple-800', icon: CheckIcon }
]

export default function ReturnDetailsPage() {
  const { user } = useAuth()
  const { get, put, loading } = useApi()
  const router = useRouter()
  const params = useParams()
  const returnId = params.id as string

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
      await put(`/api/returns/${returnId}`, {
        status: selectedStatus,
        notes: statusNotes.trim() || undefined
      })
      
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
    const statusIndex = RETURN_STATUSES.findIndex(s => s.value === currentStatus)
    if (statusIndex === -1) return RETURN_STATUSES

    // Allow moving to next status or backwards for corrections
    const nextStatuses = RETURN_STATUSES.slice(statusIndex)
    return nextStatuses
  }

  const getStatusInfo = (status: string) => {
    return RETURN_STATUSES.find(s => s.value === status) || RETURN_STATUSES[0]
  }

  if (!returnRequest) {
    return (
      <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading return request details...</p>
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
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Return Request Details</h1>
                <p className="mt-2 text-gray-600">
                  Return #{returnRequest.returnNumber} - Order #{returnRequest.order.orderNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Return Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Return Status</h2>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusInfo.color}`}>
                  <statusInfo.icon className="h-4 w-4 mr-2" />
                  {statusInfo.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requested At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(returnRequest.requestedAt)}</p>
                </div>
                {returnRequest.processedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Processed At</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(returnRequest.processedAt)}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                  <p className="mt-1 text-sm font-semibold text-green-600">{formatCurrency(returnRequest.refundAmount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Reason</label>
                  <p className="mt-1 text-sm text-gray-900">{returnRequest.reason}</p>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="mt-1 text-sm text-gray-900">{returnRequest.order.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(returnRequest.order.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="mt-1 text-sm text-gray-900">{returnRequest.order.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                  <p className="mt-1 text-sm text-gray-900">{returnRequest.order.customerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{returnRequest.order.customerPhone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Total</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(returnRequest.order.totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Return Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Items to Return</h2>
              <div className="space-y-4">
                {returnRequest.returnItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    {item.orderItem.product.images && item.orderItem.product.images.length > 0 && (
                      <img
                        src={item.orderItem.product.images[0]}
                        alt={item.orderItem.product.name}
                        className="h-16 w-16 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.orderItem.product.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {item.orderItem.product.sku}</p>
                      <p className="text-sm text-gray-500">Ordered: {item.orderItem.quantity} units</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        Return: {item.quantity} units
                      </div>
                      <div className="text-sm text-gray-500">
                        Condition: {item.condition}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.orderItem.product.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Status History</h2>
              <div className="space-y-4">
                {returnRequest.statusHistory.map((history, index) => {
                  const historyStatusInfo = getStatusInfo(history.status)
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          index === returnRequest.statusHistory.length - 1 ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <historyStatusInfo.icon className={`h-4 w-4 ${
                            index === returnRequest.statusHistory.length - 1 ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">{historyStatusInfo.label}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${historyStatusInfo.color}`}>
                            {history.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{formatDate(history.timestamp)}</p>
                        {history.notes && (
                          <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            {returnRequest.notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h2>
                <p className="text-sm text-gray-700">{returnRequest.notes}</p>
              </div>
            )}
          </div>

          {/* Return Processing */}
          <div className="space-y-6">
            {/* Update Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Update Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getNextStatuses(returnRequest.status).map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Notes
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes about this status update..."
                  />
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === returnRequest.status}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {/* Return Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Return Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items to Return:</span>
                  <span className="text-gray-900">{returnRequest.returnItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="text-gray-900">
                    {returnRequest.returnItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-medium">
                  <span className="text-gray-900">Refund Amount:</span>
                  <span className="text-green-600">{formatCurrency(returnRequest.refundAmount)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {returnRequest.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedStatus('APPROVED')
                        setStatusNotes('Return request approved')
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Approve Return
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatus('REJECTED')
                        setStatusNotes('Return request rejected')
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Reject Return
                    </button>
                  </>
                )}
                
                {returnRequest.status === 'APPROVED' && (
                  <button
                    onClick={() => {
                      setSelectedStatus('COMPLETED')
                      setStatusNotes('Return processed and refund issued')
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Complete Return
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

