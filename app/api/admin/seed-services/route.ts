import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// POST /api/admin/seed-services
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    console.log('Seeding services...')

    // Create sample services with daily pricing
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

    // Check if services already exist
    const existingServices = await prisma.service.count()
    if (existingServices > 0) {
      // Clear existing services first
      await prisma.service.deleteMany({})
      console.log(`Cleared ${existingServices} existing services`)
    }

    // Create services
    for (const service of services) {
      await prisma.service.create({
        data: service
      })
    }

    console.log(`✅ Created ${services.length} services successfully!`)

    return createResponse({
      message: `Successfully seeded ${services.length} services`,
      services: services.map(s => ({ name: s.name, category: s.category, price: s.price }))
    }, 201, 'Services seeded successfully')

  } catch (error) {
    console.error('❌ Error seeding services:', error)
    return createErrorResponse('Failed to seed services', 500)
  }
})

// GET /api/admin/seed-services - Check if services exist
export const GET = withRole(['SJFS_ADMIN'], async () => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        isActive: true
      },
      orderBy: { category: 'asc' }
    })

    return createResponse({
      services,
      count: services.length,
      message: services.length > 0 ? 'Services already exist' : 'No services found'
    }, 200, 'Services status retrieved')

  } catch (error) {
    console.error('Error checking services:', error)
    return createErrorResponse('Failed to check services', 500)
  }
})
