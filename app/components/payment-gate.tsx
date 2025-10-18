'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentStatus {
  hasActiveSubscription: boolean
  subscriptionStatus: string | null
  needsPayment: boolean
  lastPaymentDate: Date | null
  nextBillingDate: Date | null
  amountDue: number
}

interface PaymentGateProps {
  children: React.ReactNode
  userRole: string
}

export default function PaymentGate({ children, userRole }: PaymentGateProps) {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const router = useRouter()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Only check payment status for merchant roles
    if (userRole === 'MERCHANT_ADMIN' || userRole === 'MERCHANT_STAFF') {
      checkPaymentStatus()
    } else {
      setIsChecking(false)
    }
  }, [userRole])

  const checkPaymentStatus = async () => {
    try {
      const status = await get<PaymentStatus>('/api/merchants/payment-status', { silent: true })
      setPaymentStatus(status)
      
      // In cash-on-delivery model, don't redirect to payment page
      // Merchants can use services and pay when orders are delivered
    } catch (error) {
      console.error('Failed to check payment status:', error)
      // Don't redirect on error in COD model
    } finally {
      setIsChecking(false)
    }
  }

  // Show loading while checking payment status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // In cash-on-delivery model, always show children for merchant roles
  // No payment blocking - merchants pay when orders are delivered
  return <>{children}</>
}
