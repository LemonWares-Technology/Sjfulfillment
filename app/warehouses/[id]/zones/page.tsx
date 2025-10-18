'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/app/lib/utils'
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'
import WarehouseZoneModal from '@/app/components/warehouse-zone-modal'
import ServiceGate from '@/app/components/service-gate'

interface Zone {
  id: string
  name: string
  code: string
  description: string
  capacity: number
  zoneType: string
  temperatureRange: string
  isActive: boolean
  createdAt: string
  stockItems: {
    id: string
    quantity: number
    availableQuantity: number
    product: {
      name: string
      sku: string
    }
  }[]
}

interface Warehouse {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  capacity: number
  isActive: boolean
}

const ZONE_TYPES = [
  { value: 'STORAGE', label: 'Storage', color: 'bg-blue-100 text-blue-800' },
  { value: 'PICKING', label: 'Picking', color: 'bg-green-100 text-green-800' },
  { value: 'RECEIVING', label: 'Receiving', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SHIPPING', label: 'Shipping', color: 'bg-purple-100 text-purple-800' },
  { value: 'COLD_STORAGE', label: 'Cold Storage', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'HAZMAT', label: 'Hazmat', color: 'bg-red-100 text-red-800' }
]

export default function WarehouseZonesPage() {
  const { user } = useAuth()
  const { get, delete: deleteZone, loading } = useApi()
  const router = useRouter()
  const params = useParams()
  const warehouseId = params.id as string

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  useEffect(() => {
    if (warehouseId) {
      fetchWarehouse()
      fetchZones()
    }
  }, [warehouseId])

  const fetchWarehouse = async () => {
    try {
      const data = await get<Warehouse>(`/api/warehouses/${warehouseId}`)
      setWarehouse(data)
    } catch (error) {
      console.error('Failed to fetch warehouse:', error)
      router.push('/warehouses')
    }
  }

  const fetchZones = async () => {
    try {
      const data = await get<Zone[]>(`/api/warehouses/${warehouseId}/zones`)
      setZones(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch zones:', error)
      setZones([])
    }
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (confirm('Are you sure you want to delete this zone? This action cannot be undone.')) {
      try {
        await deleteZone(`/api/warehouses/${warehouseId}/zones/${zoneId}`)
        fetchZones()
      } catch (error) {
        console.error('Failed to delete zone:', error)
      }
    }
  }

  const handleAddZone = () => {
    setEditingZone(null)
    setShowZoneModal(true)
  }

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone)
    setShowZoneModal(true)
  }

  const handleCloseZoneModal = () => {
    setShowZoneModal(false)
    setEditingZone(null)
  }

  const handleSaveZone = () => {
    fetchZones()
  }

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find(t => t.value === type) || ZONE_TYPES[0]
  }

  const getCapacityUtilization = (zone: Zone) => {
    const totalStock = zone.stockItems.reduce((sum, item) => sum + item.quantity, 0)
    const utilization = zone.capacity > 0 ? (totalStock / zone.capacity) * 100 : 0
    return {
      used: totalStock,
      capacity: zone.capacity,
      utilization: Math.round(utilization)
    }
  }

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'ALL' || zone.zoneType === typeFilter
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && zone.isActive) ||
                         (statusFilter === 'INACTIVE' && !zone.isActive)
    
    return matchesSearch && matchesType && matchesStatus
  })

  if (!warehouse) {
    return (
      <DashboardLayout userRole={user?.role || 'SJFS_ADMIN'}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading warehouse details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role || 'SJFS_ADMIN'}>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/warehouses')}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Warehouse Zones</h1>
                <p className="mt-2 text-gray-600">
                  {warehouse.name} ({warehouse.code}) - {zones.length} zones
                </p>
              </div>
            </div>
            {user?.role === 'SJFS_ADMIN' && (
              <ServiceGate serviceName="Warehouse Management">
                <button
                  onClick={handleAddZone}
                  className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Zone
                </button>
              </ServiceGate>
            )}
          </div>
        </div>

        {/* Warehouse Info */}
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <MapPinIcon className="h-8 w-8 text-gray-400 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-medium text-gray-900">{warehouse.name}</h2>
              <p className="text-sm text-gray-600">{warehouse.address}</p>
              <p className="text-sm text-gray-600">{warehouse.city}, {warehouse.state}</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Code: {warehouse.code}</span>
                <span>Capacity: {warehouse.capacity ? formatCurrency(warehouse.capacity) : 'N/A'} units</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  warehouse.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search zones by name, code, or description..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={ZONE_TYPES.map(type => ({ value: type.value, label: type.label }))}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="All Types"
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
              />
            </div>
          </div>
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.map((zone) => {
            const typeInfo = getZoneTypeInfo(zone.zoneType)
            const capacity = getCapacityUtilization(zone)
            
            return (
              <div key={zone.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {zone.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        zone.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      Code: {zone.code}
                    </div>
                    {zone.description && (
                      <div className="text-sm text-gray-600">
                        {zone.description}
                      </div>
                    )}
                    {zone.temperatureRange && (
                      <div className="text-sm text-gray-600">
                        Temperature: {zone.temperatureRange}
                      </div>
                    )}
                  </div>

                  {/* Capacity Utilization */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Capacity</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(capacity.used)} / {formatCurrency(capacity.capacity)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          capacity.utilization > 90 ? 'bg-red-500' :
                          capacity.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(capacity.utilization, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{capacity.utilization}% utilized</span>
                      {capacity.utilization > 90 && (
                        <span className="text-xs text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          High usage
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Items */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Stock Items</h4>
                      <span className="text-sm text-gray-600">{zone.stockItems.length} items</span>
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {zone.stockItems.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-xs text-gray-600 flex justify-between">
                          <span className="truncate">{item.product.name}</span>
                          <span className="text-gray-400">{item.quantity}</span>
                        </div>
                      ))}
                      {zone.stockItems.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{zone.stockItems.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Created {formatDate(zone.createdAt)}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditZone(zone)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Zone"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {user?.role === 'SJFS_ADMIN' && (
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Zone"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {filteredZones.length === 0 && (
          <div className="text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No zones found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'SJFS_ADMIN' 
                ? 'Get started by creating your first zone for this warehouse.' 
                : 'No zones are available in this warehouse.'}
            </p>
            {user?.role === 'SJFS_ADMIN' && (
              <div className="mt-6">
                <button
                  onClick={handleAddZone}
                  className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md flex items-center mx-auto"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add First Zone
                </button>
              </div>
            )}
          </div>
        )}

        {/* Zone Modal */}
        <WarehouseZoneModal
          isOpen={showZoneModal}
          onClose={handleCloseZoneModal}
          warehouseId={warehouseId}
          zone={editingZone}
          onSave={handleSaveZone}
        />
      </div>
    </DashboardLayout>
  )
}

