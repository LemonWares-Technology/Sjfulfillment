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

export default function ServiceGateGroup({ 
  serviceName, 
  children, 
  buttonLabel,
  className = ""
}: ServiceGateGroupProps) {
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

      // Warehouse staff have access to certain services without merchant subscriptions
      if (user.role === 'WAREHOUSE_STAFF') {
        const warehouseStaffServices = [
          'Order Processing',
          'Inventory Management',
          'Warehouse Management',
          'Stock Management'
        ]
        
        if (warehouseStaffServices.includes(serviceName)) {
          setHasAccess(true)
          setLoading(false)
          return
        }
      }

      if (!user.merchantId) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      try {
        const response = await get<{subscriptions: MerchantService[]}>('/api/merchant-services/status')
        const subscriptions = response?.subscriptions || []
        
        const hasServiceAccess = subscriptions.some(
          sub => sub.service.name === serviceName && sub.isActive
        )
        
        setHasAccess(hasServiceAccess)
      } catch (error) {
        console.error('Failed to check service access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkServiceAccess()
  }, [user, serviceName, get])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-[5px]"></div>
      </div>
    )
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
