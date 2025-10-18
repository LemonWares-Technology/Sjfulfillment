'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { CheckCircleIcon, XCircleIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/app/lib/utils'

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

export default function ServiceSelectionPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { get, post, loading } = useApi()
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<{[key: string]: SelectedService}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

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

  const updateQuantity = (serviceId: string, quantity: number) => {
    if (quantity < 1) return
    
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        quantity
      }
    }))
  }

  const calculateTotal = () => {
    return Object.values(selectedServices).reduce((total, service) => {
      return total + (service.priceAtSelection * service.quantity)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Account Verified!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Select the services you want access to. You'll pay daily for your selected services via cash on delivery.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-800">
              <strong>Cash on Delivery:</strong> Daily charges will be accumulated and collected when orders are delivered.
            </p>
          </div>
        </div>

        {errors.fetch && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{errors.fetch}</p>
          </div>
        )}

        {/* Service Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Available Services</h2>
            
            {serviceCategories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services
                    .filter(service => service.category === category)
                    .map(service => (
                      <div
                        key={service.id}
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                          selectedServices[service.id]
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleService(service)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{service.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(service.price)}
                            </div>
                            <div className="text-xs text-gray-500">per day</div>
                          </div>
                        </div>

                        {selectedServices[service.id] && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">
                                Quantity:
                              </label>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateQuantity(service.id, selectedServices[service.id].quantity - 1)
                                  }}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center">
                                  {selectedServices[service.id].quantity}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateQuantity(service.id, selectedServices[service.id].quantity + 1)
                                  }}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Features:</h5>
                          <ul className="text-xs text-gray-600 space-y-1">
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
                <XCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Available</h3>
                <p className="text-gray-600">There are currently no services available for selection.</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
              
              {Object.keys(selectedServices).length === 0 ? (
                <p className="text-gray-500 text-sm">No services selected yet.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {Object.values(selectedServices).map(service => {
                    const serviceInfo = services.find(s => s.id === service.serviceId)
                    return (
                      <div key={service.serviceId} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <div className="font-medium text-gray-900">{serviceInfo?.name}</div>
                          <div className="text-sm text-gray-500">Qty: {service.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(service.priceAtSelection * service.quantity)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {errors.submit && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.submit}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.keys(selectedServices).length === 0}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Subscribing...' : 'Complete Setup'}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
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
