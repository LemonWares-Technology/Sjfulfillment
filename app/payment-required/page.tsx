'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/app/lib/utils'
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { initializePaystackPayment, generatePaymentReference, formatAmountForPaystack } from '@/app/lib/paystack'

interface ServicePlan {
  id: string
  name: string
  description: string
  basePrice: number
  features: any
}

interface AddonService {
  id: string
  name: string
  description: string
  price: number
  pricingType: string
}

interface PaymentStatus {
  hasActiveSubscription: boolean
  subscriptionStatus: string | null
  needsPayment: boolean
  lastPaymentDate: Date | null
  nextBillingDate: Date | null
  amountDue: number
}

export default function PaymentRequiredPage() {
  const { user } = useAuth()
  const { get, post, loading } = useApi()
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [addonServices, setAddonServices] = useState<AddonService[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [selectedAddons, setSelectedAddons] = useState<{[key: string]: number}>({})
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [plans, addons, status] = await Promise.all([
        get<ServicePlan[]>('/api/subscriptions/service-plans'),
        get<AddonService[]>('/api/subscriptions/addons-service'),
        get<PaymentStatus>('/api/merchants/payment-status')
      ])
      
      setServicePlans(plans || [])
      setAddonServices(addons || [])
      setPaymentStatus(status)
      
      // Auto-select first plan if available
      if (plans && plans.length > 0 && !selectedPlan) {
        setSelectedPlan(plans[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const calculateTotal = () => {
    const plan = servicePlans.find(p => p.id === selectedPlan)
    if (!plan) return 0

    let total = Number(plan.basePrice)
    
    Object.entries(selectedAddons).forEach(([addonId, quantity]) => {
      const addon = addonServices.find(a => a.id === addonId)
      if (addon && quantity > 0) {
        total += Number(addon.price) * quantity
      }
    })

    return total
  }

  const handleCreateSubscription = async () => {
    if (!selectedPlan) return

    try {
      const addons = Object.entries(selectedAddons)
        .filter(([_, quantity]) => quantity > 0)
        .map(([addonServiceId, quantity]) => ({ addonServiceId, quantity }))

      await post('/api/subscriptions/self-service', {
        servicePlanId: selectedPlan,
        addons
      })

      setShowPaymentForm(true)
    } catch (error) {
      console.error('Failed to create subscription:', error)
    }
  }

  const handlePayment = async () => {
    try {
      // First create subscription
      const subscriptionData = await post('/api/subscriptions/self-service', {
        merchantId: user?.merchantId,
        servicePlanId: selectedPlan,
        addons: Object.entries(selectedAddons)
          .filter(([_, quantity]) => quantity > 0)
          .map(([addonId, quantity]) => ({
            addonServiceId: addonId,
            quantity,
            priceAtPurchase: addonServices.find(a => a.id === addonId)?.price || 0
          }))
      })

      // Initialize Paystack payment
      const paymentReference = generatePaymentReference()
      const amount = formatAmountForPaystack(calculateTotal())
      
      const paymentData = await initializePaystackPayment({
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: user?.email || '',
        amount: amount,
        currency: 'NGN',
        reference: paymentReference,
        metadata: {
          subscriptionId: subscriptionData.id,
          planName: servicePlans.find(p => p.id === selectedPlan)?.name || '',
          addons: Object.entries(selectedAddons)
            .filter(([_, quantity]) => quantity > 0)
            .map(([addonId, quantity]) => ({
              addonId,
              quantity,
              name: addonServices.find(a => a.id === addonId)?.name || ''
            }))
        }
      })

      // Redirect to Paystack payment page
      window.location.href = paymentData.data.authorization_url
    } catch (error) {
      console.error('Payment initialization failed:', error)
      // Optionally show a toast or local error state
      alert('Payment initialization failed. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#121212] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#121212]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold text-[#f08c17] mb-4">Payment Required</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">To access the SJFulfillment platform, you need to select and pay for a service plan. Choose the plan that best fits your business needs.</p>
        </div>

        {!showPaymentForm ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Service Plans */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-[#f08c17] mb-6">Choose Your Service Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {servicePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-[5px] p-6 cursor-pointer transition-all border border-white/20 bg-white/10 backdrop-blur ${
                      selectedPlan === plan.id
                        ? 'ring-2 ring-amber-500 bg-white/20'
                        : 'hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                      <div className="text-2xl font-bold text-[#f08c17]">
                        {formatCurrency(plan.basePrice)}
                      </div>
                    </div>
                    <p className="text-white/90 mb-4">{plan.description}</p>
                    <div className="space-y-2">
                      {Array.isArray(plan.features) && plan.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center text-sm text-white/90">
                          <CheckCircleIcon className="h-4 w-4 text-emerald-400 mr-2" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Addon Services */}
              {addonServices.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Addon Services (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addonServices.map((addon) => (
                      <div key={addon.id} className="border border-white/20 bg-white/10 backdrop-blur rounded-[5px] p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-white">{addon.name}</h4>
                          <span className="text-sm text-white/90">{formatCurrency(addon.price)}</span>
                        </div>
                        <p className="text-sm text-white/80 mb-3">{addon.description}</p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedAddons(prev => ({
                              ...prev,
                              [addon.id]: Math.max(0, (prev[addon.id] || 0) - 1)
                            }))}
                            className="px-2 py-1 border border-white/30 text-white rounded text-sm hover:bg-white/10"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 bg-white/20 rounded text-sm text-white">
                            {selectedAddons[addon.id] || 0}
                          </span>
                          <button
                            onClick={() => setSelectedAddons(prev => ({
                              ...prev,
                              [addon.id]: (prev[addon.id] || 0) + 1
                            }))}
                            className="px-2 py-1 border border-white/30 text-white rounded text-sm hover:bg-white/10"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/30 rounded-[5px] shadow p-6 sticky top-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  {selectedPlan && (
                    <div className="flex justify-between">
                      <span className="text-white/90">
                        {servicePlans.find(p => p.id === selectedPlan)?.name}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(servicePlans.find(p => p.id === selectedPlan)?.basePrice || 0)}
                      </span>
                    </div>
                  )}
                  
                  {Object.entries(selectedAddons).map(([addonId, quantity]) => {
                    if (quantity === 0) return null
                    const addon = addonServices.find(a => a.id === addonId)
                    return (
                      <div key={addonId} className="flex justify-between text-sm">
                        <span className="text-white/90">
                          {addon?.name} × {quantity}
                        </span>
                        <span className="font-medium">
                          {formatCurrency((addon?.price || 0) * quantity)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-[#f08c17]">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateSubscription}
                  disabled={!selectedPlan || loading}
                  className="w-full mt-6 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-medium py-3 px-4 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/30 rounded-[5px] shadow p-8 backdrop-blur">
              <h2 className="text-2xl font-bold text-[#f08c17] mb-6 text-center">
                Complete Your Payment
              </h2>
              
              <div className="text-center mb-8">
                <div className="text-3xl font-bold text-[#f08c17] mb-2">
                  {formatCurrency(calculateTotal())}
                </div>
                <p className="text-white/90">Total amount to be paid</p>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-white">Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border border-white/20 rounded-[5px] hover:bg-white/10 text-center">
                    <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-white/80" />
                    <div className="font-medium">Card Payment</div>
                  </button>
                  <button className="p-4 border border-white/20 rounded-[5px] hover:bg-white/10 text-center">
                    <div className="h-8 w-8 mx-auto mb-2 bg-white/10 rounded flex items-center justify-center">
                      <span className="text-emerald-400 font-bold">B</span>
                    </div>
                    <div className="font-medium">Bank Transfer</div>
                  </button>
                  <button className="p-4 border border-white/20 rounded-[5px] hover:bg-white/10 text-center">
                    <div className="h-8 w-8 mx-auto mb-2 bg-white/10 rounded flex items-center justify-center">
                      <span className="text-sky-400 font-bold">W</span>
                    </div>
                    <div className="font-medium">Wallet</div>
                  </button>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-medium py-3 px-4 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing Payment...' : 'Pay Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
