'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, formatDateTime } from '@/app/lib/utils'

interface OrderDetails {
  orderNumber: string
  status: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: any
  orderValue: number
  deliveryFee: number
  totalAmount: number
  paymentMethod: string
  createdAt: string
  updatedAt: string
  trackingNumber?: string
  orderItems: {
    id: string
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  merchant: {
    businessName: string
    businessAddress?: string
    businessPhone?: string
    businessEmail?: string
  }
  statusHistory: {
    status: string
    createdAt: string
    notes?: string
  }[]
}

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams?.get('orderId') || null
  const trackingNumber = searchParams?.get('trackingNumber') || null
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchType, setSearchType] = useState<'orderId' | 'trackingNumber'>('orderId')

  useEffect(() => {
    if (orderId || trackingNumber) {
      setLoading(true)
      fetchOrderDetails(orderId, trackingNumber)
    }
  }, [orderId, trackingNumber])

  const fetchOrderDetails = async (orderIdParam?: string | null, trackingNumberParam?: string | null) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (orderIdParam) params.set('orderId', orderIdParam)
      if (trackingNumberParam) params.set('trackingNumber', trackingNumberParam)
      
      const response = await fetch(`/api/orders/track?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details')
      }

      setOrder(data.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err instanceof Error ? err.message : 'Failed to load order details')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return

    // Update URL with search params
    const params = new URLSearchParams()
    if (searchType === 'orderId') {
      params.set('orderId', searchInput.trim())
    } else {
      params.set('trackingNumber', searchInput.trim())
    }
    
    router.push(`/track?${params.toString()}`)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address
    if (!address) return 'N/A'
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.country
    ].filter(Boolean)
    
    return parts.join(', ') || 'N/A'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17] mx-auto mb-4"></div>
          <p className="text-white/90">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Show search form if no order is found or no params provided
  if (!order && !loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-center">
              <Image
                src={process.env.NEXT_PUBLIC_LOGO_URL || 'https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png'}
                alt="SJFulfillment"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-4 py-12">
          <div className="bg-white/10 backdrop-blur-md rounded-[5px] p-8 max-w-2xl w-full border border-white/20">
            <div className="text-center mb-8">
              <MagnifyingGlassIcon className="h-16 w-16 text-[#f08c17] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Track Your Order</h1>
              <p className="text-white/70">Enter your order number or tracking ID to check your order status</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-[5px] p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-3">Search By</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSearchType('orderId')}
                    className={`flex-1 px-4 py-3 rounded-[5px] font-medium transition-all ${
                      searchType === 'orderId'
                        ? 'bg-[#f08c17] text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Order Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('trackingNumber')}
                    className={`flex-1 px-4 py-3 rounded-[5px] font-medium transition-all ${
                      searchType === 'trackingNumber'
                        ? 'bg-[#f08c17] text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Tracking ID
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="searchInput" className="block text-white/70 text-sm font-medium mb-2">
                  {searchType === 'orderId' ? 'Order Number' : 'Tracking ID'}
                </label>
                <input
                  type="text"
                  id="searchInput"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={searchType === 'orderId' ? 'e.g., ORD-1234567890' : 'e.g., TRACK-ABC123'}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] placeholder-white/40"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!searchInput.trim()}
                className="w-full bg-gradient-to-r from-[#f08c17] to-orange-400 text-white px-6 py-3 rounded-[5px] font-medium hover:from-orange-500 hover:to-orange-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                Track Order
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-white/60 text-sm text-center">
                Need help? Contact us at{' '}
                <a href="mailto:support@sjfulfillment.com" className="text-[#f08c17] hover:underline">
                  support@sjfulfillment.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Order Not Found</h1>
          <p className="text-white/70 mb-6">{error || 'Unable to find order details'}</p>
          <a
            href="/track"
            className="inline-block bg-gradient-to-r from-[#f08c17] to-orange-400 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-500 hover:to-orange-400 transition-all"
          >
            Try Again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src={process.env.NEXT_PUBLIC_LOGO_URL || 'https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png'}
                alt="SJFulfillment"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white/70 text-sm">Order Number</p>
                <p className="text-white font-mono text-lg">{order.orderNumber}</p>
              </div>
              <a
                href="/track"
                className="bg-white/10 hover:bg-white/20 text-white/90 px-4 py-2 rounded-[5px] text-sm font-medium transition-all"
              >
                Track Another
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Order Status</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          
          {order.trackingNumber && (
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-white/70 text-sm mb-1">Tracking Number</p>
              <p className="text-white font-mono text-lg">{order.trackingNumber}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-white/70 text-sm mb-1">Order Date</p>
              <p className="text-white">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm mb-1">Last Updated</p>
              <p className="text-white">{formatDate(order.updatedAt)}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm mb-1">Payment Method</p>
              <p className="text-white">{order.paymentMethod || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Customer Information */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Customer Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-white/70 text-sm">Name</p>
                <p className="text-white">{order.customerName}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Email</p>
                <p className="text-white">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Phone</p>
                <p className="text-white">{order.customerPhone}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Shipping Address</p>
                <p className="text-white">{formatAddress(order.shippingAddress)}</p>
              </div>
            </div>
          </div>

          {/* Merchant Information */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Merchant Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-white/70 text-sm">Business Name</p>
                <p className="text-white">{order.merchant.businessName}</p>
              </div>
              {order.merchant.businessAddress && (
                <div>
                  <p className="text-white/70 text-sm">Address</p>
                  <p className="text-white">{order.merchant.businessAddress}</p>
                </div>
              )}
              {order.merchant.businessPhone && (
                <div>
                  <p className="text-white/70 text-sm">Phone</p>
                  <p className="text-white">{order.merchant.businessPhone}</p>
                </div>
              )}
              {order.merchant.businessEmail && (
                <div>
                  <p className="text-white/70 text-sm">Email</p>
                  <p className="text-white">{order.merchant.businessEmail}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white/70 text-sm font-medium pb-3">Product</th>
                  <th className="text-left text-white/70 text-sm font-medium pb-3">SKU</th>
                  <th className="text-right text-white/70 text-sm font-medium pb-3">Qty</th>
                  <th className="text-right text-white/70 text-sm font-medium pb-3">Unit Price</th>
                  <th className="text-right text-white/70 text-sm font-medium pb-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/10">
                    <td className="py-3 text-white">{item.productName}</td>
                    <td className="py-3 text-white/70 text-sm">{item.sku}</td>
                    <td className="py-3 text-white text-right">{item.quantity}</td>
                    <td className="py-3 text-white text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-white text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-white/20">
                <tr>
                  <td colSpan={4} className="py-3 text-white/70 text-right">Subtotal:</td>
                  <td className="py-3 text-white text-right font-medium">{formatCurrency(order.orderValue)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-3 text-white/70 text-right">Delivery Fee:</td>
                  <td className="py-3 text-white text-right font-medium">{formatCurrency(order.deliveryFee)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-3 text-white text-right text-lg font-bold">Total:</td>
                  <td className="py-3 text-[#f08c17] text-right text-lg font-bold">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Order History</h3>
            <div className="space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`w-3 h-3 rounded-full mt-1 ${index === 0 ? 'bg-[#f08c17]' : 'bg-white/30'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{history.status.replace('_', ' ')}</span>
                      <span className="text-white/70 text-sm">{formatDateTime(history.createdAt)}</span>
                    </div>
                    {history.notes ? (
                      <p className="text-white/70 text-sm">{history.notes}</p>
                    ) : (
                      <div className="text-white/60 flex items-center space-x-1">
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        <span className="text-xs">No message</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-white/70 text-sm">
            Need help? Contact us at <a href="mailto:support@sjfulfillment.com" className="text-[#f08c17] hover:underline">support@sjfulfillment.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17]"></div>
          <p className="mt-4 text-white/70">Loading tracking information...</p>
        </div>
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  )
}
