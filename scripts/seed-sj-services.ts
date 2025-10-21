/**
 * COMPREHENSIVE SERVICE SEEDER
 * 
 * This script seeds ALL services for the SJ Fulfillment platform:
 * 
 * 1. OPERATIONAL SERVICES (11 services)
 *    - Real fulfillment charges for logistics operations
 *    - Categories: Setup, Operations, Storage, Communication, Delivery, Returns, Payment, Management, Logistics
 *    - Used for billing merchants for actual fulfillment services
 * 
 * 2. PLATFORM FEATURE SERVICES (8 services)
 *    - Software feature access control via ServiceGate components
 *    - Categories: Core Services, Logistics, Customer Service, Analytics, Administration, Integration
 *    - Daily subscription model for platform features
 * 
 * Usage:
 *   npm run db:seed
 * 
 * Features:
 *   - Safe to run multiple times (updates existing, creates new)
 *   - Maintains existing service IDs
 *   - Detailed reporting with category breakdowns
 *   - Revenue summaries
 */

import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

// OPERATIONAL SERVICES - Actual fulfillment charges
// Note: Some legacy items are intentionally excluded/disabled to avoid cluttering the catalog
// Disabled items: Set Up Fee, Packaging Fee/SMS/Calls, Delivery Fee (Within Lagos),
// Delivery Fee (Outside Lagos), Cash On Delivery (Optional), Cargo Shipment
const operationalServices = [
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
    ]
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
    ]
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
    ]
  },
  // 'Return Fee' intentionally removed (deactivated below)
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
    ]
  }
]

// PLATFORM FEATURE SERVICES - Software feature access control
const platformServices = [
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  }
]

// Combine all services
const allServices = [...operationalServices, ...platformServices]

async function seedSJServices() {
  try {
    console.log('Starting Comprehensive Services Seeding...')
    console.log('=' .repeat(60))

    // Names of services to explicitly disable if they already exist
    const disabledServiceNames = [
      'Set Up Fee',
      'Packaging Fee/SMS/Calls',
      'Delivery Fee (Within Lagos)',
      'Delivery Fee (Outside Lagos)',
      'Cash On Delivery (Optional)',
      'Cargo Shipment',
      'Return Fee',
    ]

    // Check if services already exist
    const existingServices = await prisma.service.findMany()
    if (existingServices.length > 0) {
      console.log(`Found ${existingServices.length} existing services. Updating/Creating...`)
      
      // Update existing services or create new ones
      for (const service of allServices) {
        const existing = existingServices.find(s => s.name === service.name)
        
        if (existing) {
          await prisma.service.update({
            where: { id: existing.id },
            data: {
              description: service.description,
              price: service.price,
              category: service.category,
              features: service.features,
              isActive: true
            }
          })
          console.log(`✅ Updated: ${service.name}`)
        } else {
          await prisma.service.create({
            data: {
              ...service,
              features: service.features,
              isActive: true
            }
          })
          console.log(`✨ Created: ${service.name}`)
        }
      }

      // Disable deprecated/legacy services if present
      const disableResult = await prisma.service.updateMany({
        where: { name: { in: disabledServiceNames } },
        data: { isActive: false }
      })
      if (disableResult.count > 0) {
        console.log(`⚠️  Disabled ${disableResult.count} deprecated services`)
      }
    } else {
      // Create new services
      for (const service of allServices) {
        await prisma.service.create({
          data: {
            ...service,
            features: service.features,
            isActive: true
          }
        })
        console.log(`✨ Created: ${service.name}`)
      }

      // Also ensure disabled services remain inactive if they were pre-seeded elsewhere
      const disableResult = await prisma.service.updateMany({
        where: { name: { in: disabledServiceNames } },
        data: { isActive: false }
      })
      if (disableResult.count > 0) {
        console.log(`⚠️  Disabled ${disableResult.count} deprecated services`)
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Services seeding completed successfully!')
    console.log(`📦 Total services: ${allServices.length}`)

    // Display summary grouped by category
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: {
        name: true,
        category: true,
        price: true
      },
      orderBy: { category: 'asc' }
    })

    console.log('\n' + '=' .repeat(60))
    console.log('📋 SERVICES SUMMARY')
    console.log('=' .repeat(60))
    
    const categories = [...new Set(services.map(s => s.category))]
    
    categories.forEach(category => {
      const categoryServices = services.filter(s => s.category === category)
      const totalPrice = categoryServices.reduce((sum, s) => sum + Number(s.price), 0)
      
      console.log(`\n📁 ${category} (${categoryServices.length} services)`)
      console.log('-'.repeat(60))
      categoryServices.forEach(service => {
        console.log(`   • ${service.name.padEnd(40)} ₦${service.price.toLocaleString()}`)
      })
      console.log(`   ${'Total'.padEnd(40)} ₦${totalPrice.toLocaleString()}`)
    })

  const operationalTotal = operationalServices.reduce((sum, s) => sum + Number(s.price), 0)
  const platformTotal = platformServices.reduce((sum, s) => sum + Number(s.price), 0)
  const grandTotal = services.reduce((sum, s) => sum + Number(s.price), 0)

    console.log('\n' + '=' .repeat(60))
    console.log('💰 REVENUE BREAKDOWN')
    console.log('=' .repeat(60))
    console.log(`Operational Services Total: ₦${operationalTotal.toLocaleString()}`)
    console.log(`Platform Services Total:    ₦${platformTotal.toLocaleString()}`)
    console.log(`Grand Total:                ₦${grandTotal.toLocaleString()}`)
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Error seeding services:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
if (require.main === module) {
  seedSJServices()
    .then(() => {
      console.log('Seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}

export default seedSJServices