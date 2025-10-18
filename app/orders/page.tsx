'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { EyeIcon, TruckIcon, PlusIcon, DocumentArrowUpIcon, DocumentTextIcon, ArrowUturnLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'
import ServiceGate from '@/app/components/service-gate'
import OrderModal from '@/app/components/order-modal'
import CustomerCallButton from '@/app/components/customer-call-button'
import BulkOrderUpload from '@/app/components/bulk-order-upload'
import RefundRequestModal from '@/app/components/refund-request-modal'
import ReturnRequestModal from '@/app/components/return-request-modal'
import Pagination from '@/app/components/pagination'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  totalAmount: number
  status: string
  createdAt: string
  merchant: {
    businessName: string
  }
  orderItems: {
    id: string
    quantity: number
    product: {
      id: string
      name: string
      sku: string
      images: string[]
      unitPrice: number
    }
  }[]
}

export default function OrdersPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter])

  // Refetch when search changes
  useEffect(() => {
    if (currentPage === 1) {
      fetchOrders()
    } else {
      setCurrentPage(1)
    }
  }, [searchTerm])

  const fetchOrders = async (bypassCache: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      // Add search and filter parameters
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      const response = await get<{orders: Order[], pagination: any}>(`/api/orders?${params}`, { cache: !bypassCache })
      
      if (response && response.orders && Array.isArray(response.orders)) {
        setOrders(response.orders)
        setTotalPages(response.pagination?.pages || 1)
        setTotalItems(response.pagination?.total || 0)
      } else {
        setOrders([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([])
      setTotalPages(1)
      setTotalItems(0)
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
        return 'bg-amber-100 text-amber-800'
      case 'CONFIRMED':
        return 'bg-amber-100 text-amber-800'
      case 'PROCESSING':
        return 'bg-amber-100 text-amber-800'
      case 'SHIPPED':
        return 'bg-amber-100 text-amber-800'
      case 'DELIVERED':
        return 'bg-amber-100 text-amber-800'
      case 'RETURNED':
        return 'bg-orange-100 text-orange-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // No need for client-side filtering since we're doing server-side filtering
  const filteredOrders = orders || []

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handleDownloadReceipt = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/orders/${orderId}/receipt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to generate receipt')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${orderId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Receipt download error:', error)
      alert('Failed to download receipt. Please try again.')
    }
  }

  const handleProcessOrder = (orderId: string) => {
    // Navigate to order processing page or open processing modal
    router.push(`/orders/${orderId}/process`)
  }

  const handleRequestRefund = (order: Order) => {
    setSelectedOrder(order)
    setShowRefundModal(true)
  }

  const handleRefundSuccess = () => {
    // Refresh orders list after successful refund request
    fetchOrders(true) // Bypass cache
  }

  const handleRequestReturn = (order: Order) => {
    setSelectedOrder(order)
    setShowReturnModal(true)
  }

  const handleReturnSuccess = () => {
    fetchOrders(true) // Bypass cache
    setShowReturnModal(false)
    setSelectedOrder(null)
  }

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Orders</h1>
              <p className="mt-2 text-white">
                Manage and track all orders
              </p>
            </div>
            <div>
              <div className="flex space-x-3">
                <ServiceGate serviceName="Order Processing">
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Order
                  </button>
                </ServiceGate>
                
                <ServiceGate serviceName="Order Processing">
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-[5px] flex items-center"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                    Bulk Upload
                  </button>
                </ServiceGate>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search orders by number, customer, or merchant..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'PROCESSING', label: 'Processing' },
                  { value: 'SHIPPED', label: 'Shipped' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'RETURNED', label: 'Returned' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                placeholder="All Status"
              />
            </div>
          </div>
        </div>


        {/* Orders Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className=" divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {order.orderNumber}
                          </div>
                          {user?.role === 'SJFS_ADMIN' && (
                            <div className="text-sm text-white">
                              {order.merchant.businessName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-white">
                            {order.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {order.orderItems.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewOrder(order.id)}
                            className="text-white hover:text-amber-900"
                            title="View Order Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDownloadReceipt(order.id)}
                            className="text-white hover:text-green-900"
                            title="Download Receipt"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                          {(user?.role === 'MERCHANT_ADMIN' || user?.role === 'MERCHANT_STAFF') && (
                            <>
                              <button 
                                onClick={() => handleRequestRefund(order)}
                                className="text-white hover:text-red-900"
                                title="Request Refund"
                              >
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleRequestReturn(order)}
                                className="text-white hover:text-orange-900"
                                title="Request Return"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(user?.role === 'MERCHANT_ADMIN' || user?.role === 'MERCHANT_STAFF') && order.customerPhone && (
                            <>
                              <CustomerCallButton
                                customer={{
                                  id: `customer-${order.customerEmail}`,
                                  name: order.customerName,
                                  phone: order.customerPhone,
                                  email: order.customerEmail
                                }}
                                type="audio"
                                orderNumber={order.orderNumber}
                                className="!p-1"
                              />
                              <CustomerCallButton
                                customer={{
                                  id: `customer-${order.customerEmail}`,
                                  name: order.customerName,
                                  phone: order.customerPhone,
                                  email: order.customerEmail
                                }}
                                type="video"
                                orderNumber={order.orderNumber}
                                className="!p-1"
                              />
                            </>
                          )}
                          {order.status === 'CONFIRMED' && (user?.role === 'SJFS_ADMIN' || user?.role === 'WAREHOUSE_STAFF') && (
                            <ServiceGate serviceName="Order Processing">
                              <button 
                                onClick={() => handleProcessOrder(order.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Process Order"
                              >
                                <TruckIcon className="h-4 w-4" />
                              </button>
                            </ServiceGate>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredOrders.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-white">No orders found</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Modal */}
        <OrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          onSave={() => {
            fetchOrders(true) // Bypass cache
            setShowOrderModal(false)
          }}
        />

        {/* Bulk Upload Modal */}
        <BulkOrderUpload
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            fetchOrders(true) // Bypass cache
            setShowBulkUpload(false)
          }}
        />

        {/* Refund Request Modal */}
        {selectedOrder && (
          <RefundRequestModal
            isOpen={showRefundModal}
            onClose={() => {
              setShowRefundModal(false)
              setSelectedOrder(null)
            }}
            order={selectedOrder}
            onSuccess={handleRefundSuccess}
          />
        )}

        {/* Return Request Modal */}
        {selectedOrder && (
          <ReturnRequestModal
            isOpen={showReturnModal}
            onClose={() => {
              setShowReturnModal(false)
              setSelectedOrder(null)
            }}
            order={selectedOrder}
            onSuccess={handleReturnSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
