'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime } from '@/app/lib/utils'
import {
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface OrderItem {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    sku: string
    images: string[]
  }
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: any
  totalAmount: number
  deliveryFee: number
  status: string
  trackingNumber?: string
  expectedDelivery?: string
  createdAt: string
  merchant: {
    businessName: string
  }
  orderItems: OrderItem[]
  statusHistory: {
    status: string
    timestamp: string
    notes?: string
  }[]
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'PICKED', label: 'Picked', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'PACKED', label: 'Packed', color: 'bg-orange-100 text-orange-800' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: 'bg-pink-100 text-pink-800' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

export default function OrderProcessPage() {
  const { user } = useAuth()
  const { get, put, loading } = useApi()
  const router = useRouter()
  const params: any = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Check if user can process orders
  const canProcessOrder = () => {
    return user?.role === 'SJFS_ADMIN' || user?.role === 'WAREHOUSE_STAFF'
  }

  const fetchOrder = async () => {
    try {
      const data = await get<Order>(`/api/orders/${orderId}`)
      setOrder(data)
      setSelectedStatus(data.status)
      setTrackingNumber(data.trackingNumber || '')
      setExpectedDelivery(data.expectedDelivery ? new Date(data.expectedDelivery).toISOString().split('T')[0] : '')
    } catch (error) {
      console.error('Failed to fetch order:', error)
      toast.error('Failed to load order details')
      router.push('/orders')
    }
  }

  const handleStatusUpdate = async () => {
    if (!order || !selectedStatus) return

    setIsUpdating(true)
    try {
      const updateData: any = {
        status: selectedStatus,
        notes: notes.trim() || undefined
      }

      if (selectedStatus === 'SHIPPED' && trackingNumber) {
        updateData.trackingNumber = trackingNumber
      }

      if (expectedDelivery) {
        updateData.expectedDelivery = new Date(expectedDelivery).toISOString()
      }

      await put(`/api/orders/${orderId}`, updateData)

      toast.success('Order status updated successfully')
      fetchOrder() // Refresh order data
    } catch (error) {
      console.error('Failed to update order:', error)
      toast.error('Failed to update order status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getNextStatuses = (currentStatus: string) => {
    const statusIndex = ORDER_STATUSES.findIndex(s => s.value === currentStatus)
    if (statusIndex === -1) return ORDER_STATUSES

    // Allow moving to next status or backwards for corrections
    const nextStatuses = ORDER_STATUSES.slice(statusIndex)
    return nextStatuses
  }

  // Check access permissions
  if (!canProcessOrder()) {
    return (
      <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-[5px] p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-4">
                You don't have permission to process orders. Only administrators and logistics staff can change order statuses.
              </p>
              <button
                onClick={() => router.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-[5px] font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Process Order</h1>
              <p className="mt-2 text-white">
                Order #{order.orderNumber} - {order.customerName}
              </p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="bg-gray-100  hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-[5px] font-medium transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">Name</label>
                  <p className="mt-1 text-sm text-white">{order.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Email</label>
                  <p className="mt-1 text-sm text-white flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {order.customerEmail}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Phone</label>
                  <p className="mt-1 text-sm text-white flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {order.customerPhone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Merchant</label>
                  <p className="mt-1 text-sm text-white">{order.merchant.businessName}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Shipping Address</h2>
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-white mr-3 mt-0.5" />
                <div className="text-sm text-white">
                  {order.shippingAddress && (
                    <div>
                      <p>{order.shippingAddress.street}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                      <p>{order.shippingAddress.country} {order.shippingAddress.postalCode}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-[5px]">
                    {item.product.images && item.product.images.length > 0 && (
                      <Image
                        width={64}
                        height={64}
                        loading='lazy'
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-16 w-16 object-cover rounded-[5px]"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-white">{item.product.name}</h3>
                      <p className="text-sm text-white">SKU: {item.product.sku}</p>
                    </div>
                    <div className="text-sm text-white">
                      Qty: {item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Status History</h2>
              <div className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{history.status}</p>
                      <p className="text-sm text-white">{formatDateTime((history as any).timestamp || (history as any).createdAt)}</p>
                      {history.notes ? (
                        <p className="text-sm text-white mt-1">{history.notes}</p>
                      ) : (
                        <div className="mt-1 text-white/70 flex items-center space-x-1">
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          <span className="text-xs">No message</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Processing */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Current Status</h2>
              <div className="text-center">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${ORDER_STATUSES.find(s => s.value === order.status)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                  {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
                </span>
              </div>
            </div>

            {/* Update Status */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Update Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getNextStatuses(order.status).map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStatus === 'SHIPPED' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tracking number"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes about this status update..."
                  />
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === order.status}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-[5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white/30 shadow rounded-[5px] p-6">
              <h2 className="text-lg font-medium text-white mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">Order Value:</span>
                  <span className="text-white">{formatCurrency(order.totalAmount - order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Delivery Fee:</span>
                  <span className="text-white">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span className="text-white">Total:</span>
                  <span className="text-white">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

