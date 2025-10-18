'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatDate } from '@/app/lib/utils'
import { ArrowUpIcon, CogIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import StockMovementModal from '@/app/components/stock-movement-modal'
import Pagination from '@/app/components/pagination'

interface StockItem {
  id: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  reorderLevel: number
  product: {
    id: string
    name: string
    sku: string
  }
  warehouse: {
    id: string
    name: string
    address: string
  }
  updatedAt: string
}

export default function InventoryPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  // Removed filteredItems state since we're using server-side filtering
  const [showLowStock, setShowLowStock] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [stockLevelFilter, setStockLevelFilter] = useState('all') // all, low, out, high
  const [sortBy, setSortBy] = useState('name') // name, quantity, lastUpdated
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchStockItems()
  }, [currentPage])

  // Refetch when filters change
  useEffect(() => {
    if (currentPage === 1) {
      fetchStockItems()
    } else {
      setCurrentPage(1)
    }
  }, [searchTerm, categoryFilter, warehouseFilter, stockLevelFilter])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Using stockItems directly since we're doing server-side filtering

  const fetchStockItems = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })
      
      // Add search and filter parameters
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (warehouseFilter) params.append('warehouse', warehouseFilter);
      if (stockLevelFilter !== 'all') params.append('stockLevel', stockLevelFilter);
      
      console.log('Fetching stock items with params:', params.toString());
      const response = await get<{stockItems: StockItem[], pagination: any}>(`/api/stock?${params}`)
      console.log('Stock items response:', response);
      
      if (response?.stockItems) {
        setStockItems(Array.isArray(response.stockItems) ? response.stockItems : [])
        setTotalPages(response.pagination?.pages || 1)
        setTotalItems(response.pagination?.total || 0)
      } else {
        setStockItems([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Failed to fetch stock items:', error)
      setStockItems([])
      setTotalPages(1)
      setTotalItems(0)
    }
  }

  const getStockStatus = (item: StockItem) => {
    if (item.availableQuantity <= 0) {
      return { color: 'bg-red-100 text-red-800', text: 'Out of Stock' }
    } else if (item.availableQuantity <= item.reorderLevel) {
      return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' }
    } else {
      return { color: 'bg-green-100 text-green-800', text: 'In Stock' }
    }
  }

  // Remove this line - filteredItems is now managed by useEffect

  const handleStockMovement = (stockItemId: string) => {
    setSelectedStockId(stockItemId)
    setShowMovementModal(true)
  }

  const handleCloseMovementModal = () => {
    setShowMovementModal(false)
    setSelectedStockId(null)
  }

  const handleSaveMovement = () => {
    fetchStockItems()
  }

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Inventory</h1>
              <p className="mt-2 text-white">
                Manage your stock levels and inventory
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => fetchStockItems()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button 
                onClick={async () => {
                  if (stockItems.length > 0) {
                    const firstItem = stockItems[0]
                    try {
                      const response = await fetch(`/api/debug/stock/${firstItem.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ quantity: 100 })
                      })
                      const result = await response.json()
                      console.log('Debug stock update result:', result)
                      fetchStockItems()
                    } catch (error) {
                      console.error('Debug stock update failed:', error)
                    }
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                Test Stock Update
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[5px] flex items-center">
                <ArrowUpIcon className="h-5 w-5 mr-2" />
                Stock In
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white/30 shadow rounded-[5px] p-6 mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-white mr-2" />
            <h2 className="text-lg font-medium text-white">Filters & Search</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Search products..."
                />
              </div>
            </div>

            {/* Warehouse Filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Warehouse</label>
              <input
                type="text"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Filter by warehouse..."
              />
            </div>

            {/* Stock Level Filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Stock Level</label>
              <select
                value={stockLevelFilter}
                onChange={(e) => setStockLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Stock Levels</option>
                <option value="high">High Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Sort By</label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="name">Name</option>
                  <option value="quantity">Quantity</option>
                  <option value="lastUpdated">Last Updated</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-[5px] hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
            </div>
          </div>
        </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setStockLevelFilter('low')
                setSearchTerm('')
                setWarehouseFilter('')
              }}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
            >
              Low Stock Only
            </button>
            <button
              onClick={() => {
                setStockLevelFilter('out')
                setSearchTerm('')
                setWarehouseFilter('')
              }}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200"
            >
              Out of Stock
            </button>
            <button
              onClick={() => {
                setStockLevelFilter('high')
                setSearchTerm('')
                setWarehouseFilter('')
              }}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200"
            >
              High Stock
            </button>
            <button
              onClick={() => {
                setStockLevelFilter('all')
                setSearchTerm('')
                setWarehouseFilter('')
                setSortBy('name')
                setSortOrder('asc')
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-white">
            Showing {stockItems.length} items
            {searchTerm && ` matching "${searchTerm}"`}
            {stockLevelFilter !== 'all' && ` with ${stockLevelFilter} stock`}
          </p>
        </div>

        {/* Inventory Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6 rounded-[5px]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 rounded-[5px]">
                <thead className="bg-gray-50 rounded-[5px]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reserved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reorder Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className=" divide-y divide-gray-200 text-white" >
                  {stockItems.map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <tr key={item.id} className="">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {item.product.name}
                            </div>
                            <div className="text-sm text-white">
                              SKU: {item.product.sku}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {item.warehouse.name}
                            </div>
                            <div className="text-sm text-white">
                              {item.warehouse.address}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.reservedQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {item.availableQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.reorderLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleStockMovement(item.id)}
                            className="text-[#f08c17] hover:text-blue-900 flex items-center"
                          >
                            <CogIcon className="h-4 w-4 mr-1" />
                            Move Stock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {stockItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white mb-4">No inventory items found</p>
                <p className="text-sm text-white mb-4">
                  This could mean products don't have stock items yet. Try creating a product or doing a bulk upload.
                </p>
                <button
                  onClick={() => window.location.href = '/products'}
                  className="bg-[#f08c17] transition-all duration-300 hover:bg-amber-700 text-white px-4 py-2 rounded-[5px]"
                >
                  Go to Products
                </button>
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

        {/* Stock Movement Modal */}
        <StockMovementModal
          isOpen={showMovementModal}
          onClose={handleCloseMovementModal}
          stockItemId={selectedStockId}
          onSave={handleSaveMovement}
        />
      </div>
    </DashboardLayout>
  )
}
