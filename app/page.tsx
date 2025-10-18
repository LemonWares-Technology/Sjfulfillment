'use client'

import { useAuth } from './lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect to appropriate dashboard based on role
        switch (user.role) {
          case 'SJFS_ADMIN':
            router.push('/admin/dashboard')
            break
          case 'MERCHANT_ADMIN':
            router.push('/merchant/dashboard')
            break
          case 'MERCHANT_STAFF':
            router.push('/staff/dashboard')
            break
          case 'WAREHOUSE_STAFF':
            router.push('/warehouse/dashboard')
            break
          default:
            router.push('/welcome')
        }
      } else {
        router.push('/welcome')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SJFulfillment...</p>
        </div>
      </div>
    )
  }

  return null
}