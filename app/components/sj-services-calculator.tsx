'use client'

import { useState, useEffect } from 'react'
import { CalculatorIcon, CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/app/lib/utils'

interface Service {
  id: string
  name: string
  description: string
  price: number
  category: string
  features: string[]
}

interface ServiceSelection {
  serviceId: string
  quantity: number
  priceAtSelection: number
}

interface SJServicesCalculatorProps {
  services: Service[]
  onSelectionChange?: (selections: ServiceSelection[]) => void
  showDetails?: boolean
}

export default function SJServicesCalculator({ 
  services, 
  onSelectionChange, 
  showDetails = true 
}: SJServicesCalculatorProps) {
  const [selections, setSelections] = useState<{[key: string]: ServiceSelection}>({})
  const [showCalculator, setShowCalculator] = useState(false)

  const serviceCategories = [...new Set(services.map(s => s.category))]

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Object.values(selections))
    }
  }, [selections, onSelectionChange])

  const toggleService = (service: Service) => {
    setSelections(prev => {
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
    
    setSelections(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        quantity
      }
    }))
  }

  const calculateTotal = () => {
    return Object.values(selections).reduce((total, service) => {
      return total + (service.priceAtSelection * service.quantity)
    }, 0)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Setup':
        return '🚀'
      case 'Operations':
        return '⚙️'
      case 'Storage':
        return '📦'
      case 'Communication':
        return '📱'
      case 'Delivery':
        return '🚚'
      case 'Returns':
        return '↩️'
      case 'Payment':
        return '💳'
      case 'Management':
        return '👥'
      case 'Logistics':
        return '🌐'
      default:
        return '📋'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Setup':
        return 'bg-purple-100 text-purple-800'
      case 'Operations':
        return 'bg-amber-100 text-amber-800'
      case 'Storage':
        return 'bg-green-100 text-green-800'
      case 'Communication':
        return 'bg-yellow-100 text-yellow-800'
      case 'Delivery':
        return 'bg-red-100 text-red-800'
      case 'Returns':
        return 'bg-orange-100 text-orange-800'
      case 'Payment':
        return 'bg-indigo-100 text-indigo-800'
      case 'Management':
        return 'bg-pink-100 text-pink-800'
      case 'Logistics':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <CalculatorIcon className="h-8 w-8 mr-3 text-amber-600" />
              SJ Services Calculator
            </h2>
            <p className="text-gray-600 mt-1">
              Calculate your daily service costs with our comprehensive pricing structure
            </p>
          </div>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <CalculatorIcon className="h-5 w-5 mr-2" />
            {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
          </button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Object.keys(selections).length}</div>
            <div className="text-sm text-gray-600">Services Selected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())}</div>
            <div className="text-sm text-gray-600">Daily Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(calculateTotal() * 30)}</div>
            <div className="text-sm text-gray-600">Monthly Estimate</div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      {showCalculator && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Services List */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Services</h3>
              
              {serviceCategories.map(category => (
                <div key={category} className="mb-6">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-2">{getCategoryIcon(category)}</span>
                    <h4 className="text-lg font-medium text-gray-900">{category}</h4>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                      {services.filter(s => s.category === category).length} services
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {services
                      .filter(service => service.category === category)
                      .map(service => (
                        <div
                          key={service.id}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            selections[service.id]
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleService(service)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{service.name}</h5>
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(service.price)}
                              </div>
                              <div className="text-xs text-gray-500">per day</div>
                            </div>
                          </div>

                          {selections[service.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">
                                  Quantity:
                                </label>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateQuantity(service.id, selections[service.id].quantity - 1)
                                    }}
                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center">
                                    {selections[service.id].quantity}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateQuantity(service.id, selections[service.id].quantity + 1)
                                    }}
                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {showDetails && (
                            <div className="mt-3">
                              <h6 className="text-sm font-medium text-gray-700 mb-2">Features:</h6>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {service.features.slice(0, 3).map((feature, index) => (
                                  <li key={index} className="flex items-center">
                                    <InformationCircleIcon className="h-3 w-3 text-amber-500 mr-2" />
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
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
                
                {Object.keys(selections).length === 0 ? (
                  <p className="text-gray-500 text-sm">No services selected yet.</p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {Object.values(selections).map(service => {
                      const serviceInfo = services.find(s => s.id === service.serviceId)
                      return (
                        <div key={service.serviceId} className="flex justify-between items-center py-2 border-b border-gray-200">
                          <div>
                            <div className="font-medium text-gray-900">{serviceInfo?.name}</div>
                            <div className="text-sm text-gray-500">Qty: {service.quantity}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(service.priceAtSelection * service.quantity)}
                            </div>
                            <div className="text-sm text-gray-500">per day</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Daily Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Estimate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotal() * 30)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Yearly Estimate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotal() * 365)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-5 w-5 text-amber-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-900">Payment Method</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        All charges are collected via Cash on Delivery when orders are fulfilled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
