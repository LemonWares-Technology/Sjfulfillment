import { prisma } from './prisma'

export async function ensureDefaultServices() {
  // Check if any services exist
  const existingServices = await prisma.service.findMany({
    where: { isActive: true }
  })

  if (existingServices.length > 0) {
    return existingServices
  }

  // Create default services if none exist
  console.log('No services found, creating default services...')
  
  const services = [
    {
      name: 'Inventory Management',
      description: 'Track stock levels, manage products, and monitor inventory across warehouses',
      price: 500, // ₦500 per day
      category: 'Core Services',
      features: [
        'Real-time stock tracking',
        'Low stock alerts',
        'Product management',
        'Multi-warehouse support',
        'Barcode scanning'
      ],
      isActive: true
    },
    {
      name: 'Order Processing',
      description: 'Process orders, manage fulfillment, and track order status',
      price: 300, // ₦300 per day
      category: 'Core Services',
      features: [
        'Order management',
        'Status tracking',
        'Customer notifications',
        'Order history',
        'Bulk order processing'
      ],
      isActive: true
    },
    {
      name: 'Warehouse Management',
      description: 'Manage warehouse operations, zones, and staff assignments',
      price: 400, // ₦400 per day
      category: 'Core Services',
      features: [
        'Warehouse zones',
        'Staff management',
        'Location tracking',
        'Capacity management',
        'Performance metrics'
      ],
      isActive: true
    },
    {
      name: 'Delivery Tracking',
      description: 'Track deliveries, manage logistics partners, and monitor delivery performance',
      price: 200, // ₦200 per day
      category: 'Logistics',
      features: [
        'Real-time tracking',
        'Delivery notifications',
        'Partner management',
        'Performance analytics',
        'Route optimization'
      ],
      isActive: true
    },
    {
      name: 'Returns Management',
      description: 'Handle product returns, refunds, and restocking processes',
      price: 150, // ₦150 per day
      category: 'Customer Service',
      features: [
        'Return processing',
        'Refund management',
        'Restocking workflows',
        'Quality control',
        'Customer communication'
      ],
      isActive: true
    },
    {
      name: 'Analytics Dashboard',
      description: 'Business insights, reports, and performance analytics',
      price: 250, // ₦250 per day
      category: 'Analytics',
      features: [
        'Sales reports',
        'Performance metrics',
        'Trend analysis',
        'Custom dashboards',
        'Export capabilities'
      ],
      isActive: true
    },
    {
      name: 'Staff Management',
      description: 'Manage staff accounts, permissions, and access control',
      price: 100, // ₦100 per day
      category: 'Administration',
      features: [
        'User management',
        'Role-based access',
        'Permission control',
        'Activity logging',
        'Team collaboration'
      ],
      isActive: true
    },
    {
      name: 'API Access',
      description: 'Programmatic access to platform features via REST API',
      price: 350, // ₦350 per day
      category: 'Integration',
      features: [
        'REST API access',
        'Webhook support',
        'Data synchronization',
        'Third-party integrations',
        'Custom development'
      ],
      isActive: true
    }
  ]

  // Create services
  const createdServices = []
  for (const service of services) {
    const created = await prisma.service.create({
      data: service
    })
    createdServices.push(created)
  }

  console.log(`Created ${createdServices.length} default services`)
  return createdServices
}

export async function ensureSJServices() {
  // Check if SJ services exist
  const existingSJServices = await prisma.service.findMany({
    where: { 
      isActive: true,
      category: { in: ['Setup', 'Operations', 'Storage', 'Communication', 'Delivery', 'Returns', 'Payment', 'Management', 'Logistics'] }
    }
  })

  if (existingSJServices.length > 0) {
    return existingSJServices
  }

  // Create SJ services if none exist
  console.log('No SJ services found, creating default SJ services...')
  
  const sjServices = [
    {
      name: 'Receiving Fee',
      description: 'Fee for receiving and processing incoming inventory at warehouse',
      price: 50.00,
      category: 'Operations',
      features: [
        'Inventory receiving and inspection',
        'Quality control checks',
        'Documentation and recording',
        'Storage allocation'
      ],
      isActive: true
    },
    {
      name: 'Fulfillment Fee',
      description: 'Fee for order processing, picking, and packing',
      price: 100.00,
      category: 'Operations',
      features: [
        'Order processing and validation',
        'Product picking and verification',
        'Professional packaging',
        'Quality assurance checks'
      ],
      isActive: true
    },
    {
      name: 'Storage/Warehousing Fee',
      description: 'Daily storage fee for inventory kept in warehouse',
      price: 25.00,
      category: 'Storage',
      features: [
        'Secure warehouse storage',
        'Climate-controlled environment',
        'Inventory tracking and management',
        'Regular stock audits'
      ],
      isActive: true
    },
    // 'Return Fee' intentionally omitted (deprecated operational charge)
    {
      name: 'Account Management Fee',
      description: 'Monthly fee for dedicated account management and support',
      price: 2000.00,
      category: 'Management',
      features: [
        'Dedicated account manager',
        'Monthly performance reports',
        'Strategic planning support',
        'Priority customer support'
      ],
      isActive: true
    }
  ]

  // Create SJ services
  const createdSJServices = []
  for (const service of sjServices) {
    const created = await prisma.service.create({
      data: service
    })
    createdSJServices.push(created)
  }

  console.log(`Created ${createdSJServices.length} SJ services`)
  return createdSJServices
}

export async function ensureMerchantDefaultSubscription(merchantId: string) {
  // Check if merchant has any active subscriptions
  const existingSubscriptions = await prisma.merchantServiceSubscription.findMany({
    where: { 
      merchantId,
      status: 'ACTIVE'
    }
  })

  if (existingSubscriptions.length > 0) {
    return existingSubscriptions
  }

  // Ensure services exist
  const services = await ensureDefaultServices()
  
  // Create default subscription for essential services
  const essentialServices = services.filter(service => 
    ['Inventory Management', 'Order Processing', 'Staff Management'].includes(service.name)
  )

  const subscriptions = []
  for (const service of essentialServices) {
    const subscription = await prisma.merchantServiceSubscription.create({
      data: {
        merchantId,
        serviceId: service.id,
        quantity: 1,
        priceAtSubscription: service.price,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: null // No end date for active subscriptions
      }
    })
    subscriptions.push(subscription)
  }

  console.log(`Created ${subscriptions.length} default subscriptions for merchant ${merchantId}`)
  return subscriptions
}
