'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { 
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon
} from '@heroicons/react/24/outline'

export default function UnauthorizedPage() {
  const { logout } = useAuth()
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(5)
  const hasLoggedOutRef = useRef(false)

  useEffect(() => {
    // Visible countdown + auto-logout at 0
    setSecondsLeft(5)
    hasLoggedOutRef.current = false

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1
        if (next <= 0 && !hasLoggedOutRef.current) {
          hasLoggedOutRef.current = true
          // Clear interval before calling logout to avoid state updates after unmount
          clearInterval(interval)
          logout()
        }
        return Math.max(next, 0)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [logout])

  const handleLogout = () => {
    logout()
  }

  const handleGoHome = () => {
    router.push('/welcome')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/30 rounded-[5px] shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Unauthorized Access
        </h1>
        
        <p className="text-white mb-6">
          Your session has expired or you don't have permission to access this resource. 
          You will be automatically logged out in a few seconds.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-[5px] shadow-sm text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            Logout Now
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-[5px] shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Go to Home
          </button>
        </div>
        
        <div className="mt-6 text-xs text-white">
          Auto-logout in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}...
        </div>
      </div>
    </div>
  )
}
