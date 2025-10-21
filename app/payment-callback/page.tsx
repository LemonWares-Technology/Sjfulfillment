'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApi } from '@/app/lib/use-api'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

function PaymentCallbackContent() {
  const router = useRouter()
  const searchParams: any = useSearchParams()
  const { get } = useApi()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const reference = searchParams.get('reference')
    const trxref = searchParams.get('trxref')

    if (!reference && !trxref) {
      setStatus('error')
      setMessage('No payment reference found')
      return
    }

    verifyPayment(reference || trxref)
  }, [searchParams])

  const verifyPayment = async (reference: string) => {
    try {
      const response = await get(`/api/payments/paystack/verify?reference=${reference}`)
      
      if (response.status) {
        setStatus('success')
        setMessage('Payment successful! Your subscription is now active.')
        
        // Redirect to service selection after 3 seconds
        setTimeout(() => {
          router.push('/service-selection')
        }, 3000)
      } else {
        setStatus('error')
        setMessage('Payment verification failed. Please contact support.')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      setStatus('error')
      setMessage('Payment verification failed. Please contact support.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <ClockIcon className="mx-auto h-16 w-16 text-blue-500 mb-4 animate-spin" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Verifying Payment
              </h1>
              <p className="text-lg text-gray-600">
                Please wait while we verify your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to service selection...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {message}
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/payment-required')}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-3 px-4 rounded-lg"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/merchant/dashboard')}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="mx-auto h-16 w-16 text-blue-500 mb-4 animate-spin" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  )
}
