import { prisma } from './prisma'

export interface ServiceAccess {
  hasAccess: boolean
  allowedServices: string[]
  subscriptionDetails: {
    serviceId: string
    serviceName: string
    quantity: number
    features: string[]
  }[]
}

/**
 * Check if a merchant has access to specific services
 */
export async function checkServiceAccess(merchantId: string, requiredServices?: string[]): Promise<ServiceAccess> {
  try {
    const subscriptions = await prisma.merchantServiceSubscription.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
        endDate: { gte: new Date() } // Not expired
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            features: true
          }
        }
      }
    })

    const allowedServices = subscriptions.map(sub => sub.serviceId)
    const subscriptionDetails = subscriptions.map(sub => ({
      serviceId: sub.serviceId,
      serviceName: sub.service.name,
      quantity: sub.quantity,
      features: sub.service.features
    }))

    // If specific services are required, check if merchant has access to all of them
    let hasAccess = true
    if (requiredServices && requiredServices.length > 0) {
      hasAccess = requiredServices.every(serviceId => allowedServices.includes(serviceId))
    }

    return {
      hasAccess,
      allowedServices,
      subscriptionDetails
    }
  } catch (error) {
    console.error('Error checking service access:', error)
    return {
      hasAccess: false,
      allowedServices: [],
      subscriptionDetails: []
    }
  }
}

/**
 * Check if merchant has access to a specific service
 */
export async function hasServiceAccess(merchantId: string, serviceId: string): Promise<boolean> {
  const access = await checkServiceAccess(merchantId, [serviceId])
  return access.hasAccess
}

/**
 * Get merchant's subscribed services with details
 */
export async function getMerchantServices(merchantId: string) {
  try {
    return await prisma.merchantServiceSubscription.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            features: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error('Error getting merchant services:', error)
    return []
  }
}

/**
 * Service categories and their required services
 */
export const SERVICE_CATEGORIES = {
  'INVENTORY_MANAGEMENT': ['inventory_tracking', 'stock_alerts', 'warehouse_management'],
  'ORDER_PROCESSING': ['order_management', 'order_tracking', 'order_fulfillment'],
  'CUSTOMER_MANAGEMENT': ['customer_database', 'customer_communication', 'customer_analytics'],
  'REPORTING_ANALYTICS': ['sales_reports', 'inventory_reports', 'performance_analytics'],
  'INTEGRATION_APIS': ['api_access', 'webhook_support', 'third_party_integration']
} as const

/**
 * Check if merchant has access to a service category
 */
export async function hasCategoryAccess(merchantId: string, category: keyof typeof SERVICE_CATEGORIES): Promise<boolean> {
  const requiredServices = SERVICE_CATEGORIES[category]
  const access = await checkServiceAccess(merchantId, requiredServices)
  return access.hasAccess
}
