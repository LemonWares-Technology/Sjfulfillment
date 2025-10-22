'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon } from '@heroicons/react/24/outline'

/**
 * ServiceGateGroup Component
 * 
 * Consolidates multiple features behind a single service subscription button.
 * 
 * Use Case:
 * When you have multiple buttons/features that require the same service
 * (e.g., "Add Product" and "Bulk Upload" both need "Inventory Management"),
 * instead of showing 2 separate "Subscribe to Inventory Management" buttons,
 * this component shows just ONE button with a custom label.
 * 
 * Example Usage:
 * ```tsx
 * <ServiceGateGroup 
 *   serviceName="Inventory Management"
 *   buttonLabel="Subscribe to access Products API"
 * >
 *   <button>Add Product</button>
 *   <button>Bulk Upload</button>
 *   <button>Export CSV</button>
 * </ServiceGateGroup>
 * ```
 * 
 * This will check if user has "Inventory Management" subscription.
 * - If YES: Show all 3 buttons normally
 * - If NO: Show ONE red "Subscribe to access Products API" button instead
 * 
 * Benefits:
 * - Better UX: One button instead of multiple duplicates
 * - Saves space: Especially important on mobile
 * - Cleaner UI: Less visual clutter
 * 
 * @param serviceName - The service to check (e.g., "Inventory Management")
 * @param children - The buttons/features to show when user has access
 * @param buttonLabel - Custom label for the subscribe button (e.g., "Subscribe to access Products API")
 * @param className - Additional CSS classes
 */

interface ServiceGateGroupProps {
  serviceName: string
  children: React.ReactNode
  buttonLabel?: string
  className?: string
}

interface MerchantService {
  id: string
  service: {
    name: string
    description: string
  }
  isActive: boolean
}

// Reuse the same cache as ServiceGate for consistency
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

async function fetchSubscriptions(get: <T>(url: string, options?: any) => Promise<T>, merchantId: string): Promise<MerchantService[]> {
  if (inFlight.has(merchantId)) return inFlight.get(merchantId) as Promise<MerchantService[]>
  const p = (async () => {
    try {
      const response = await get<{ subscriptions: MerchantService[] }>('/api/merchant-services/status', { silent: true })
      const subs = response?.subscriptions || []
      subscriptionCache.set(merchantId, { at: Date.now(), subscriptions: subs })
      inFlight.delete(merchantId)
      return subs
    } catch (error) {
      // Remove from in-flight on error so retries are possible
      inFlight.delete(merchantId)
      console.error('Error fetching subscriptions:', error)
      return [] // Return empty array on error instead of throwing
    }
  })()
  inFlight.set(merchantId, p)
  return p
}

export default function ServiceGateGroup({ 
  serviceName, 
  children, 
  buttonLabel,
  className = ""
}: ServiceGateGroupProps) {
  const { user } = useAuth()
  const { get } = useApi()
  const router = useRouter()
  // Use null initially to prevent flickering
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkServiceAccess = async () => {
      if (!user) {
        setHasAccess(false)
        setIsChecking(false)
        return
      }

      // Instant access for admin
      if (user.role === 'SJFS_ADMIN') {
        setHasAccess(true)
        setIsChecking(false)
        return
      }

      // Instant access for warehouse staff on certain services
      if (user.role === 'WAREHOUSE_STAFF') {
        const warehouseStaffServices = [
          'Order Processing',
          'Inventory Management',
          'Warehouse Management',
          'Stock Management'
        ]
        
        if (warehouseStaffServices.includes(serviceName)) {
          setHasAccess(true)
          setIsChecking(false)
          return
        }
      }

      if (!user.merchantId) {
        setHasAccess(false)
        setIsChecking(false)
        return
      }

      try {
        // Check cache first
        const cached = getCachedSubscriptions(user.merchantId)
        if (cached) {
          const hasServiceAccess = cached.some(sub => sub.service.name === serviceName && sub.isActive)
          setHasAccess(hasServiceAccess)
          setIsChecking(false)
          return
        }

        // Fetch with deduplication
        const subs = await fetchSubscriptions(get, user.merchantId)
        const hasServiceAccess = subs.some(sub => sub.service.name === serviceName && sub.isActive)
        setHasAccess(hasServiceAccess)
        setIsChecking(false)
      } catch (error) {
        console.error('Failed to check service access:', error)
        setHasAccess(false)
        setIsChecking(false)
      }
    }

    checkServiceAccess()
  }, [user, serviceName, get])

  // Show nothing while checking to prevent flicker
  if (isChecking) {
    return null
  }

  // If user has access, show all the wrapped children normally
  if (hasAccess) {
    return <>{children}</>
  }

  const handleSubscribe = () => {
    router.push(`/merchant/plans?service=${encodeURIComponent(serviceName)}`)
  }

  // If user doesn't have access, show ONE subscribe button instead of all children
  return (
    <button
      onClick={handleSubscribe}
      className={`bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-[5px] transition-colors duration-200 flex items-center shadow-md ${className}`}
    >
      <LockClosedIcon className="h-5 w-5 mr-2" />
      {buttonLabel || `Subscribe to ${serviceName}`}
    </button>
  )
}
