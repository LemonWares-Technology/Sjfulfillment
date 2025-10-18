'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface ServiceGateProps {
  serviceName: string
  children: React.ReactNode
  fallbackMessage?: string
  className?: string
  showIconOnly?: boolean
}

interface MerchantService {
  id: string
  service: {
    name: string
    description: string
  }
  isActive: boolean
}

export default function ServiceGate({ 
  serviceName, 
  children, 
  fallbackMessage,
  className = "",
  showIconOnly = true
}: ServiceGateProps) {
  const { user } = useAuth()
  const { get } = useApi()
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
        const response = await get<{subscriptions: MerchantService[]}>('/api/merchant-services/status')
        console.log('ServiceGate - API Response:', response)
        const subscriptions = response?.subscriptions || []
        console.log('ServiceGate - Subscriptions:', subscriptions)
        console.log('ServiceGate - Checking service:', serviceName)
        
        const hasServiceAccess = subscriptions.some(
          sub => sub.service.name === serviceName && sub.isActive
        )
        
        console.log('ServiceGate - Has access:', hasServiceAccess)
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
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  const defaultMessage = `This feature requires the "${serviceName}" service. Please subscribe to this service to access this functionality.`
  const message = fallbackMessage || defaultMessage

  if (showIconOnly) {
    return (
      <div className={`relative inline-flex group ${className}`}>
        <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
        {/* Tooltip positioned below to avoid negative offsets; wraps text and limits width to prevent page overflow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white/90 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none max-w-[320px] sm:max-w-xs whitespace-normal break-words z-50 shadow-lg">
          {message}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 text-white/90 ${className}`}>
      <InformationCircleIcon className="h-5 w-5 text-[#f08c17]" />
      <span className="text-sm max-w-[640px] whitespace-normal break-words" title={message}>
        {message}
      </span>
    </div>
  )
}
