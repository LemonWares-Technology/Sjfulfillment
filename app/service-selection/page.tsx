'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import DashboardLayout from '@/app/components/dashboard-layout'
import { CheckCircleIcon, XCircleIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/app/lib/utils'

/**
 * Service Selection Page
 * 
 * This page allows merchants to subscribe to various services after account creation.
 * It can also be accessed from ServiceGate buttons when users try to access features they haven't subscribed to.
 * 
 * Features:
 * - Displays all available active services grouped by category
 * - Highlights specific service if navigated via ?service=ServiceName query param
 * - Auto-scrolls to highlighted service for better UX
 * - Shows real-time order summary with total daily charges
 * - Services are charged daily via cash on delivery
 * 
 * Query Parameters:
 * - service: String - Name of the service to highlight and scroll to (e.g., ?service=Staff Management)
 * 
 * User Flow:
 * 1. User clicks "Subscribe to X" button from ServiceGate component
 * 2. Redirected here with ?service=X parameter
 * 3. Page loads, highlights and scrolls to that specific service
 * 4. User can select multiple services
 * 5. On submit, creates subscriptions and redirects to dashboard
 */

interface Service {
  id: string
  name: string
  description: string
  price: number
  category: string
  features: string[]
  isActive: boolean
}

interface SelectedService {
  serviceId: string
  quantity: number
  priceAtSelection: number
}

function ServiceSelectionContent() {
  const router = useRouter()
  const searchParams: any = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { get, post, loading } = useApi()
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<{[key: string]: SelectedService}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [highlightedService, setHighlightedService] = useState<string | null>(null)
  const serviceRefs = useRef<{[key: string]: HTMLDivElement | null}>({})

  useEffect(() => {
    console.log('Service selection page loaded, user:', user, 'authLoading:', authLoading)
    if (authLoading) {
      console.log('Auth still loading...')
      return
    }
    if (!user) {
      console.log('No user found, redirecting to login')
      router.push('/welcome')
      return
    }
    fetchServices()
  }, [user, router, authLoading])

  useEffect(() => {
    // Check if there's a specific service to highlight from query params
    const serviceName = searchParams.get('service')
    if (serviceName && services.length > 0) {
      setHighlightedService(serviceName)
      // Find and scroll to the service
      const service = services.find(s => s.name === serviceName)
      if (service && serviceRefs.current[service.id]) {
        setTimeout(() => {
          serviceRefs.current[service.id]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 300)
      }
    }
  }, [searchParams, services])

  const fetchServices = async () => {
    try {
      console.log('Fetching services...')
      const data = await get<Service[]>('/api/services')
      console.log('Services data received:', data)
      // Filter active services
      const processedServices = data.filter(service => service.isActive)
      console.log('Processed services:', processedServices)
      setServices(processedServices)
    } catch (error) {
      console.error('Failed to fetch services:', error)
      setErrors({ fetch: 'Failed to load services. Please refresh the page.' })
    }
  }

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const newSelection = { ...prev }
      if (newSelection[service.id]) {
        delete newSelection[service.id]
      } else {
        newSelection[service.id] = {
          serviceId: service.id,
          quantity: 1,
          priceAtSelection: service.price
        }
      }
      return newSelection
    })
  }

  const calculateTotal = () => {
    return Object.values(selectedServices).reduce((total, service) => {
      return total + service.priceAtSelection
    }, 0)
  }

  const handleSubmit = async () => {
    if (Object.keys(selectedServices).length === 0) {
      setErrors({ submit: 'Please select at least one service to continue.' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Create service subscriptions for selected services
      await post('/api/merchant-services/subscribe', {
        merchantId: user?.merchantId,
        services: Object.values(selectedServices)
      })

      // Redirect to dashboard
      router.push('/merchant/dashboard')
    } catch (error) {
      console.error('Failed to subscribe to services:', error)
      setErrors({ submit: 'Failed to subscribe to services. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const serviceCategories = [...new Set(services.map(s => s.category))]

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">
            Account Verified!
          </h1>
          <p className="text-lg text-gray-300 mb-4">
            Select the services you want access to. You'll pay daily for your selected services via cash on delivery.
          </p>
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-200">
              <strong>Cash on Delivery:</strong> Daily charges will be accumulated and collected when orders are delivered.
            </p>
          </div>
        </div>

        {errors.fetch && (
          <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-200">{errors.fetch}</p>
          </div>
        )}

        {/* Service Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-white mb-6">Available Services</h2>
            
            {serviceCategories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-medium text-gray-200 mb-4 border-b border-gray-700 pb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services
                    .filter(service => service.category === category)
                    .map(service => (
                      <div
                        key={service.id}
                        ref={(el) => { serviceRefs.current[service.id] = el }}
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all backdrop-blur-sm ${
                          selectedServices[service.id]
                            ? 'border-amber-500 bg-amber-500/10'
                            : highlightedService === service.name
                            ? 'border-red-500 bg-red-500/10 animate-pulse'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                        onClick={() => toggleService(service)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-white">{service.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{service.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-amber-500">
                              {formatCurrency(service.price)}
                            </div>
                            <div className="text-xs text-gray-400">per day</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Features:</h5>
                          <ul className="text-xs text-gray-400 space-y-1">
                            {service.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2" />
                                {feature}
                              </li>
                            ))}
                            {service.features.length > 3 && (
                              <li className="text-gray-500">
                                +{service.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {services.length === 0 && !errors.fetch && (
              <div className="text-center py-12">
                <XCircleIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Services Available</h3>
                <p className="text-gray-400">There are currently no services available for selection.</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Selected Services</h3>
              
              {Object.keys(selectedServices).length === 0 ? (
                <p className="text-gray-400 text-sm">No services selected yet.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {Object.values(selectedServices).map(service => {
                    const serviceInfo = services.find(s => s.id === service.serviceId)
                    return (
                      <div key={service.serviceId} className="flex justify-between items-center py-2 border-b border-gray-700">
                        <div>
                          <div className="font-medium text-white">{serviceInfo?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-amber-500">
                            {formatCurrency(service.priceAtSelection)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-lg font-bold text-amber-500">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {errors.submit && (
                  <div className="mb-4 bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-200 text-sm">{errors.submit}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.keys(selectedServices).length === 0}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Subscribing...' : 'Complete Setup'}
                </button>

                <p className="text-xs text-gray-400 mt-3 text-center">
                  You can add or remove services later from your dashboard. Daily charges will be collected via cash on delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServiceSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ServiceSelectionContent />
    </Suspense>
  )
}
