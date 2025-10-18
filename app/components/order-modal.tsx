'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'
import { formatCurrency } from '@/app/lib/utils'

interface Product {
  id: string
  name: string
  sku: string
  unitPrice: number
  category: string
  stockItems: {
    quantity: number
    availableQuantity: number
    reservedQuantity: number
    warehouse: {
      id: string
      name: string
      code: string
    }
  }[]
}

interface OrderItem {
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function OrderModal({ isOpen, onClose, onSave }: OrderModalProps) {
  const { post, get, loading } = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [productSearchTerm, setProductSearchTerm] = useState<string>('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(12) // 12 products per page for better grid layout

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
      fetchWarehouses()
    }
  }, [isOpen])

  // Refetch when search changes
  useEffect(() => {
    if (isOpen) {
      if (currentPage === 1) {
        fetchProducts()
      } else {
        setCurrentPage(1)
      }
    }
  }, [productSearchTerm, isOpen])

  // Refetch when page changes
  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [currentPage, isOpen])

  const fetchProducts = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      if (productSearchTerm) params.append('search', productSearchTerm)
      
      console.log('Fetching products with params:', params.toString())
      const response = await get<{products: Product[], pagination: any}>(`/api/products?${params.toString()}`)
      console.log('Products API response:', response)
      
      setProducts(response?.products || [])
      
      // Update pagination info
      if (response?.pagination) {
        setTotalPages(response.pagination.pages || 1)
        setTotalItems(response.pagination.total || 0)
        setCurrentPage(response.pagination.page || 1)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await get<{warehouses: any[]}>('/api/warehouses')
      console.log('Warehouse API response:', response)
      setWarehouses(response?.warehouses || [])
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }

  const addProductToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        quantity: 1,
        unitPrice: Number(product.unitPrice),
        totalPrice: Number(product.unitPrice)
      }
      setOrderItems([...orderItems, newItem])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(item => item.productId !== productId))
      return
    }

    setOrderItems(orderItems.map(item => 
      item.productId === productId 
        ? { 
            ...item, 
            quantity: newQuantity, 
            totalPrice: Number(newQuantity * item.unitPrice)
          }
        : item
    ))
  }

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId))
  }

  const getTotalAmount = () => {
    return Number(orderItems.reduce((total, item) => total + item.totalPrice, 0))
  }

  const getAvailableQuantity = (product: Product) => {
    const stockItem = product.stockItems.find(item => 
      selectedWarehouse ? item.warehouse.id === selectedWarehouse : true
    )
    return stockItem?.availableQuantity || 0
  }

  // No need for client-side filtering since we're doing server-side filtering
  const filteredProducts = products

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (orderItems.length === 0) {
      alert('Please add at least one product to the order')
      return
    }

    if (!selectedWarehouse) {
      alert('Please select a warehouse')
      return
    }

    try {
      const orderData = {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        shippingAddress: {
          street: customerInfo.address,
          city: 'Lagos', // Default city
          state: 'Lagos', // Default state
          country: 'Nigeria'
        },
        warehouseId: selectedWarehouse,
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice)
        })),
        orderValue: getTotalAmount(),
        deliveryFee: 0, // Can be calculated based on location
        paymentMethod: 'COD'
      }

      await post('/api/orders', orderData)
      onSave()
      onClose()
      
      // Reset form
      setOrderItems([])
      setCustomerInfo({ name: '', email: '', phone: '', address: '' })
      setSelectedWarehouse('')
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('Failed to create order. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Create New Order
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Warehouse *
              </label>
              <select
                required
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selection */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Add Products</h3>
              
              {/* Product Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or category..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const availableQty = getAvailableQuantity(product)
                  const orderItem = orderItems.find(item => item.productId === product.id)
                  
                  return (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(product.unitPrice)}</p>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {availableQty} available
                        </span>
                      </div>
                      
                      {orderItem ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, orderItem.quantity - 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{orderItem.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, orderItem.quantity + 1)}
                              disabled={orderItem.quantity >= availableQty}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(product.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addProductToOrder(product)}
                          disabled={availableQty === 0}
                          className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-[5px] hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* No products found message */}
              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {productSearchTerm ? 'No products found matching your search.' : 'No products available.'}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} products
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-[5px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-[5px] ${
                            currentPage === pageNum
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-[5px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2">
                  {orderItems.map(item => {
                    const product = products.find(p => p.id === item.productId)
                    return (
                      <div key={item.productId} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{product?.name}</span>
                          <span className="text-gray-600 ml-2">x {item.quantity}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[5px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || orderItems.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-[5px] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

