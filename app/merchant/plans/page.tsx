'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState, useRef, Suspense } from 'react'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import { useSearchParams } from 'next/navigation'
import { 
  CheckIcon, 
  XMarkIcon, 
  InformationCircleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'

interface Service {
  id: string
  name: string
  description: string
  price: number
  category: string
  features: string[]
  isActive: boolean
}

interface MerchantServiceSubscription {
  id: string
  serviceId: string
  quantity: number
  priceAtSubscription: number
  status: string
  startDate: string
  endDate: string | null
  service: Service
}

interface SelectedService {
  serviceId: string
  price: number
}

interface PlanUpdateStatus {
  canUpdate: boolean
  lastUpdate: string | null
  nextUpdateAvailable: string | null
  hoursRemaining: number
}

/**
 * Plan Management Page
 * 
 * This page allows merchants to manage their service subscriptions within the dashboard.
 * 
 * Key Features:
 * - View all available services organized by category
 * - Add/remove services from their subscription plan (simple on/off toggle)
 * - See real-time cost calculations (current vs. new plan)
 * - 24-hour update restriction to prevent frequent changes
 * 
 * Navigation & Highlighting:
 * When users click "Subscribe to {service}" from ServiceGate component,
 * they are redirected here with a query parameter: ?service={serviceName}
 * The page then:
 * 1. Highlights the requested service with a red pulsing border
 * 2. Automatically scrolls it into view
 * 3. Clears the highlight after 3 seconds
 * 
 * This provides seamless navigation from gated features to the subscription page.
 */

function PlanManagementContent() {
  const { get, post, put, loading } = useApi()
  const searchParams: any = useSearchParams() // Get query parameters for service highlighting
  const [services, setServices] = useState<Service[]>([])
  const [currentSubscriptions, setCurrentSubscriptions] = useState<MerchantServiceSubscription[]>([])
  const [selectedServices, setSelectedServices] = useState<{[key: string]: SelectedService}>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<PlanUpdateStatus | null>(null)
  const [highlightedService, setHighlightedService] = useState<string | null>(null) // Track which service to highlight
  const serviceRefs = useRef<{[key: string]: HTMLDivElement | null}>({}) // Refs for scrolling to services

  useEffect(() => {
    fetchData()
  }, [])

  /**
   * Handle service highlighting from query parameters
   * When navigating from ServiceGate with ?service={name}, this will:
   * 1. Highlight the specified service card with a pulse animation
   * 2. Scroll the service into view smoothly
   * 3. Clear the highlight after 3 seconds
   */
  useEffect(() => {
    const serviceName = searchParams.get('service')
    if (serviceName && services.length > 0) {
      // Set the highlighted service
      setHighlightedService(serviceName)
      
      // Find the service by name and scroll to it
      const service = services.find(s => s.name === serviceName)
      if (service && serviceRefs.current[service.id]) {
        // Delay to ensure DOM is ready
        setTimeout(() => {
          serviceRefs.current[service.id]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 300)
      }
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedService(null)
      }, 3000)
    }
  }, [searchParams, services])

  const fetchData = async () => {
    try {
      // Fetch all active services available for subscription
      const servicesData = await get<Service[]>('/api/services')
      
      const processedServices = servicesData
        .filter(service => service.isActive)
        .map(service => ({
          ...service,
          price: typeof service.price === 'string' ? parseFloat(service.price) : service.price
        }))
      setServices(processedServices)

      // Fetch merchant's current active subscriptions
      let subscriptionsData: MerchantServiceSubscription[] = []
      try {
        subscriptionsData = await get<MerchantServiceSubscription[]>(`/api/merchant-services/subscribe?t=${Date.now()}`)
        setCurrentSubscriptions(subscriptionsData || [])
      } catch (error) {
        console.error('Error fetching subscriptions:', error)
        setCurrentSubscriptions([])
      }

      // Check if merchant can update their plan (24-hour restriction)
      try {
        const statusData = await get<PlanUpdateStatus>('/api/merchant-services/update-status')
        setUpdateStatus(statusData)
      } catch (error) {
        console.error('Error fetching update status:', error)
        setUpdateStatus({
          canUpdate: true,
          lastUpdate: null,
          nextUpdateAvailable: null,
          hoursRemaining: 0
        })
      }

      // Initialize selected services state with current active subscriptions
      // This allows users to see what they currently have and make changes
      const initialSelected: {[key: string]: SelectedService} = {}
      if (subscriptionsData) {
        subscriptionsData.forEach(sub => {
          if (sub.status === 'ACTIVE') {
            initialSelected[sub.serviceId] = {
              serviceId: sub.serviceId,
              price: Number(sub.priceAtSubscription)
            }
          }
        })
      }
      setSelectedServices(initialSelected)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const newSelected = { ...prev }
      if (newSelected[service.id]) {
        delete newSelected[service.id]
      } else {
        newSelected[service.id] = {
          serviceId: service.id,
          price: service.price
        }
      }
      return newSelected
    })
  }

  const subscribeToAllServices = () => {
    const allServices: {[key: string]: SelectedService} = {}
    services.forEach(service => {
      allServices[service.id] = {
        serviceId: service.id,
        price: service.price
      }
    })
    setSelectedServices(allServices)
  }

  const calculateTotal = () => {
    return Object.values(selectedServices).reduce((total, service) => {
      return total + service.price
    }, 0)
  }

  const calculateCurrentTotal = () => {
    return currentSubscriptions
      .filter(sub => sub.status === 'ACTIVE')
      .reduce((total, sub) => {
        return total + (Number(sub.priceAtSubscription) * sub.quantity)
      }, 0)
  }

  const getServiceStatus = (serviceId: string) => {
    const subscription = currentSubscriptions.find(sub => sub.serviceId === serviceId && sub.status === 'ACTIVE')
    if (!subscription) return 'not_subscribed'
    
    const selected = selectedServices[serviceId]
    if (!selected) return 'removing'
    return 'active'
  }

  const handleUpdatePlan = async () => {
    setIsUpdating(true)
    try {
      // Get services to add/update (quantity is always 1 now)
      const servicesToUpdate = Object.values(selectedServices).map(service => ({
        serviceId: service.serviceId,
        quantity: 1
      }))

      // Get services to remove (currently subscribed but not in selected)
      const currentServiceIds = currentSubscriptions
        .filter(sub => sub.status === 'ACTIVE')
        .map(sub => sub.serviceId)
      const selectedServiceIds = Object.keys(selectedServices)
      const servicesToRemove = currentServiceIds.filter(id => !selectedServiceIds.includes(id))

      // Update subscriptions
      await post('/api/merchant-services/update-plan', {
        servicesToUpdate,
        servicesToRemove
      })

      // Refresh data
      await fetchData()
      setShowComparison(false)
    } catch (error) {
      console.error('Failed to update plan:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusIcon = (serviceId: string) => {
    const status = getServiceStatus(serviceId)
    switch (status) {
      case 'active':
        return <CheckIcon className="h-5 w-5 text-green-600" />
      case 'removing':
        return <XMarkIcon className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusText = (serviceId: string) => {
    const status = getServiceStatus(serviceId)
    switch (status) {
      case 'active':
        return 'Current'
      case 'removing':
        return 'Removing'
      default:
        return 'New'
    }
  }

  const serviceCategories = [...new Set(services.map(s => s.category))]

  return (
    <DashboardLayout userRole="MERCHANT_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Plan Management</h1>
              <p className="mt-2 text-white/90">
                Manage your service subscriptions and daily costs
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={subscribeToAllServices}
                disabled={isUpdating || loading || services.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-[5px] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-5 w-5 mr-2" />
                Subscribe to All Services
              </button>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-white px-4 py-2 rounded-[5px] flex items-center border border-white/20 hover:bg-white/10"
              >
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                {showComparison ? 'Hide' : 'Show'} Comparison
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={isUpdating || loading}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* Plan Update Status */}
        {updateStatus && !updateStatus.canUpdate && (
          <div className="mb-6 bg-white/10 border border-white/20 rounded-[5px] p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">
                  Plan Update Restricted
                </h3>
                <div className="mt-2 text-sm text-white/90">
                  <p>
                    You can only update your plan once every 24 hours. 
                    {updateStatus.hoursRemaining > 0 && (
                      <span> Please wait for {updateStatus.hoursRemaining} hour(s).</span>
                    )}
                  </p>
                  {updateStatus.lastUpdate && (
                    <p className="mt-1">
                      Last updated: {formatDate(updateStatus.lastUpdate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Summary */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/30 overflow-hidden shadow rounded-[5px] backdrop-blur">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Current Daily Cost
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {formatCurrency(calculateCurrentTotal())}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow rounded-[5px] backdrop-blur">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUpIcon className="h-6 w-6 text-sky-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      New Daily Cost
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {formatCurrency(calculateTotal())}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/30 overflow-hidden shadow rounded-[5px] backdrop-blur">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl text-white">₦</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Daily Difference
                    </dt>
                    <dd className={`text-lg font-medium ${
                      calculateTotal() > calculateCurrentTotal() 
                        ? 'text-rose-400' 
                        : calculateTotal() < calculateCurrentTotal()
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}>
                      {calculateTotal() > calculateCurrentTotal() ? '+' : ''}
                      {formatCurrency(calculateTotal() - calculateCurrentTotal())}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services by Category */}
        {services.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Services Available</h3>
              <p className="text-yellow-700">
                There are currently no services available for subscription. Please contact support or try refreshing the page.
              </p>
              <button
                onClick={fetchData}
                className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
              >
                Refresh Services
              </button>
            </div>
          </div>
        ) : (
          serviceCategories.map(category => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold text-[#f08c17] mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services
                  .filter(service => service.category === category)
                  .map(service => {
                  const isSelected = !!selectedServices[service.id]
                  const currentSubscription = currentSubscriptions.find(sub => sub.serviceId === service.id && sub.status === 'ACTIVE')
                  const status = getServiceStatus(service.id)
                  const isHighlighted = highlightedService === service.name // Check if this service should be highlighted
                  
                  return (
                    <div
                      key={service.id}
                      ref={(el) => { serviceRefs.current[service.id] = el }} // Store ref for scrolling
                      className={`relative rounded-[5px] shadow-md border transition-all duration-200 bg-white/10 border-white/20 backdrop-blur ${
                        isSelected 
                          ? 'ring-2 ring-amber-500' 
                          : 'hover:bg-white/10'
                      } ${
                        isHighlighted ? 'ring-4 ring-red-500 animate-pulse' : '' // Add pulsing red ring for highlighted service
                      }`}
                    >
                      {/* Status Badge */}
                      {status !== 'not_subscribed' && (
                        <div className="absolute top-3 right-3 flex items-center space-x-1">
                          {getStatusIcon(service.id)}
                          <span className="text-xs font-medium text-white/90">
                            {getStatusText(service.id)}
                          </span>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {service.name}
                            </h3>
                            <p className="text-sm text-white/80 mb-4">
                              {service.description}
                            </p>
                            <div className="text-2xl font-bold text-[#f08c17]">
                              {formatCurrency(service.price)}
                              <span className="text-sm font-normal text-white/70">/day</span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-white mb-2">Features:</h4>
                          <ul className="text-sm text-white/90 space-y-1">
                            {service.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <CheckIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                            {service.features.length > 3 && (
                              <li className="text-xs text-white/70">
                                +{service.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Current Subscription Info */}
                        {currentSubscription && (
                          <div className="mb-4 p-3 bg-white/10 rounded-[5px] border border-white/10">
                            <div className="text-sm text-white/80">
                              <div>Subscribed: {formatCurrency(Number(currentSubscription.priceAtSubscription))}/day</div>
                            </div>
                          </div>
                        )}

                        {/* Selection Controls */}
                        <div className="space-y-3">
                          <button
                            onClick={() => toggleService(service)}
                            className={`w-full py-2 px-4 rounded-[5px] font-medium transition-colors ${
                              isSelected
                                ? 'border border-white/20 text-white hover:bg-white/10'
                                : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white'
                            }`}
                          >
                            {isSelected ? 'Remove Service' : 'Add Service'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))
        )}

        {/* Plan Comparison */}
        {showComparison && (
          <div className="mt-8 bg-white/30 shadow rounded-[5px] p-6 backdrop-blur">
            <h3 className="text-lg font-medium text-white mb-4">Plan Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-2">Current Plan</h4>
                <div className="space-y-2">
                  {currentSubscriptions
                    .filter(sub => sub.status === 'ACTIVE')
                    .map(sub => (
                      <div key={sub.id} className="flex justify-between text-sm text-white/90">
                        <span>{sub.service.name}</span>
                        <span>{formatCurrency(Number(sub.priceAtSubscription))}/day</span>
                      </div>
                    ))}
                  <div className="border-t border-white/20 pt-2 font-medium text-white">
                    Total: {formatCurrency(calculateCurrentTotal())}/day
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">New Plan</h4>
                <div className="space-y-2">
                  {Object.values(selectedServices).map(service => {
                    const serviceData = services.find(s => s.id === service.serviceId)
                    return (
                      <div key={service.serviceId} className="flex justify-between text-sm text-white/90">
                        <span>{serviceData?.name}</span>
                        <span>{formatCurrency(service.price)}/day</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-white/20 pt-2 font-medium text-white">
                    Total: {formatCurrency(calculateTotal())}/day
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Plan Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleUpdatePlan}
             disabled={
              isUpdating || 
              loading || 
              calculateTotal() === calculateCurrentTotal() ||
               (!!updateStatus && !updateStatus.canUpdate)
            }
            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-6 py-3 rounded-[5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating Plan...' : 'Update Plan'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PlanManagementPage() {
  return (
    <Suspense fallback={
      <DashboardLayout userRole="MERCHANT_ADMIN">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
          </div>
        </div>
      </DashboardLayout>
    }>
      <PlanManagementContent />
    </Suspense>
  )
}
