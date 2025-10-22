'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon } from '@heroicons/react/24/outline'

/**
 * ServiceGate Component
 * 
 * Restricts access to features based on merchant's service subscriptions.
 * 
 * Display Modes:
 * - inline (default): Shows a compact red "Subscribe to {service}" button 
 *   in place of the gated content. Best for replacing individual buttons/actions.
 * - block: Shows a full modal-like card with explanation. Best for blocking 
 *   entire sections or pages.
 * 
 * Access Control:
 * - SJFS_ADMIN: Always has access to everything
 * - WAREHOUSE_STAFF: Has access to specific services without subscription
 * - MERCHANT_ADMIN/MERCHANT_STAFF: Requires active service subscription
 * 
 * Navigation:
 * When users click the subscribe button, they're redirected to:
 * /merchant/plans?service={serviceName}
 * 
 * This allows the plans page to automatically scroll to and highlight
 * the specific service they need to subscribe to.
 * 
 * @param serviceName - The name of the service to check (e.g., "Staff Management")
 * @param children - The content to show when user has access
 * @param mode - 'inline' for button replacement, 'block' for full card display
 * @param fallbackMessage - Custom message for block mode
 * @param className - Additional CSS classes
 * @param showIconOnly - Legacy prop, kept for backwards compatibility
 */

interface ServiceGateProps {
  serviceName: string
  children: React.ReactNode
  fallbackMessage?: string
  className?: string
  showIconOnly?: boolean
  mode?: 'inline' | 'block' // New prop to control display mode
}

interface MerchantService {
  id: string
  service: {
    name: string
    description: string
  }
  isActive: boolean
}

// Simple in-memory cache to speed up repeated checks within a short window
const SUBSCRIPTION_TTL_MS = 60_000 // 1 minute
type CacheEntry = { at: number; subscriptions: MerchantService[] }
const subscriptionCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<MerchantService[]>>()

function getCachedSubscriptions(merchantId: string): MerchantService[] | null {
  const entry = subscriptionCache.get(merchantId)
  if (!entry) return null
  if (Date.now() - entry.at > SUBSCRIPTION_TTL_MS) {
    subscriptionCache.delete(merchantId)
    return null
  }
  return entry.subscriptions
}

async function fetchSubscriptions(get: <T>(url: string) => Promise<T>, merchantId: string): Promise<MerchantService[]> {
  if (inFlight.has(merchantId)) return inFlight.get(merchantId) as Promise<MerchantService[]>
  const p = (async () => {
    const response = await get<{ subscriptions: MerchantService[] }>('/api/merchant-services/status')
    const subs = response?.subscriptions || []
    subscriptionCache.set(merchantId, { at: Date.now(), subscriptions: subs })
    inFlight.delete(merchantId)
    return subs
  })()
  inFlight.set(merchantId, p)
  return p
}

export default function ServiceGate({ 
  serviceName, 
  children, 
  fallbackMessage,
  className = "",
  showIconOnly = true,
  mode = 'inline' // Default to inline mode
}: ServiceGateProps) {
  const { user } = useAuth()
  const { get } = useApi()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkServiceAccess = async () => {
      if (!user) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      if (user.role === 'SJFS_ADMIN') {
        // SJFS_ADMIN has access to everything
        setHasAccess(true)
        setLoading(false)
        return
      }

      // Warehouse staff and logistics users have access to certain services without merchant subscriptions
      if (user.role === 'WAREHOUSE_STAFF') {
        // Define which services warehouse staff can access without subscription
        const warehouseStaffServices = [
          'Order Processing',
          'Inventory Management',
          'Warehouse Management',
          'Stock Management'
        ]
        
        console.log('ServiceGate - Warehouse staff checking service:', serviceName)
        console.log('ServiceGate - Available services:', warehouseStaffServices)
        
        if (warehouseStaffServices.includes(serviceName)) {
          console.log('ServiceGate - Warehouse staff granted access to:', serviceName)
          setHasAccess(true)
          setLoading(false)
          return
        } else {
          console.log('ServiceGate - Warehouse staff denied access to:', serviceName)
        }
      }

      if (!user.merchantId) {
        console.log('ServiceGate - No merchantId found for user:', user.role)
        setHasAccess(false)
        setLoading(false)
        return
      }

      try {
        // Use cached subscriptions if available for instant decision
        const cached = getCachedSubscriptions(user.merchantId)
        if (cached) {
          const hasServiceAccess = cached.some(sub => sub.service.name === serviceName && sub.isActive)
          setHasAccess(hasServiceAccess)
          setLoading(false)
          return
        }

        // For inline mode, render the fallback immediately while we fetch in background
        if (mode === 'inline') {
          setLoading(false)
        }

        const subs = await fetchSubscriptions(get, user.merchantId)
        const hasServiceAccess = subs.some(sub => sub.service.name === serviceName && sub.isActive)
        setHasAccess(hasServiceAccess)
      } catch (error) {
        console.error('Failed to check service access:', error)
        setHasAccess(false)
      } finally {
        // Only keep loading if we're in block mode and no cache was present
        if (mode === 'block') setLoading(false)
      }
    }

    checkServiceAccess()
  }, [user, serviceName, get, mode])

  // For inline mode, prefer to show the button immediately instead of a skeleton
  if (loading && mode === 'block') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  const handleSubscribe = () => {
    /**
     * Navigate to merchant plans page with the service name as a query parameter
     * This allows the plans page to:
     * 1. Automatically scroll to the requested service
     * 2. Highlight it with a pulsing animation
     * 3. Make it easy for users to subscribe to the specific service they need
     */
    router.push(`/merchant/plans?service=${encodeURIComponent(serviceName)}`)
  }

  // Inline mode: Show a compact red button in place of the wrapped content
  if (mode === 'inline') {
    return (
      <button
        onClick={handleSubscribe}
        className={`bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-[5px] transition-colors duration-200 flex items-center shadow-md ${className}`}
      >
        <LockClosedIcon className="h-5 w-5 mr-2" />
        Subscribe to {serviceName}
      </button>
    )
  }

  // Block mode: Show the full modal-like display (original behavior)
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <LockClosedIcon className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Subscription Required
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {fallbackMessage || `Subscribe to "${serviceName}" to access this feature`}
        </p>
        <button
          onClick={handleSubscribe}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-[5px] transition-colors duration-200 flex items-center justify-center"
        >
          <LockClosedIcon className="h-5 w-5 mr-2" />
          Subscribe to {serviceName}
        </button>
      </div>
    </div>
  )
}
