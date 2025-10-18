import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function seedServices() {
  try {
    // Force seeding for development
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

    // Clear existing services first
    await prisma.service.deleteMany({})

    // Create services
    for (const service of services) {
      await prisma.service.create({
        data: service
      })
    }

    console.log(`✅ Created ${services.length} services successfully!`)
    
    // Display created services
    const createdServices = await prisma.service.findMany({
      orderBy: { category: 'asc' }
    })
    
    console.log('\n📋 Created Services:')
    createdServices.forEach(service => {
      console.log(`- ${service.name}: ₦${service.price}/day (${service.category})`)
    })

  } catch (error) {
    console.error('❌ Error seeding services:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedServices()

