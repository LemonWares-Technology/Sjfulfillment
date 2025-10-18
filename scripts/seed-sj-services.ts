import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

const sjServices = [
  {
    name: 'Set Up Fee',
    description: 'One-time setup fee for new merchant onboarding and account configuration',
    price: 5000.00,
    category: 'Setup',
    features: [
      'Account setup and configuration',
      'Initial system training',
      'Documentation and guidelines',
      'Support team introduction'
    ]
  },
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
  {
    name: 'Packaging Fee/SMS/Calls',
    description: 'Fee for packaging materials and customer communication',
    price: 75.00,
    category: 'Communication',
    features: [
      'Professional packaging materials',
      'SMS notifications to customers',
      'Phone call support',
      'Order status updates'
    ]
  },
  {
    name: 'Delivery Fee (Within Lagos)',
    description: 'Delivery fee for orders within Lagos state',
    price: 500.00,
    category: 'Delivery',
    features: [
      'Same-day delivery (Lagos)',
      'Real-time tracking',
      'Delivery confirmation',
      'Customer support'
    ]
  },
  {
    name: 'Delivery Fee (Outside Lagos)',
    description: 'Delivery fee for orders outside Lagos state',
    price: 1000.00,
    category: 'Delivery',
    features: [
      'Nationwide delivery',
      'Express shipping options',
      'Tracking and updates',
      'Delivery confirmation'
    ]
  },
  {
    name: 'Return Fee',
    description: 'Fee for processing returned items and refunds',
    price: 200.00,
    category: 'Returns',
    features: [
      'Return processing and inspection',
      'Refund processing',
      'Quality assessment',
      'Restocking or disposal'
    ]
  },
  {
    name: 'Cash On Delivery (Optional)',
    description: 'Optional COD service for cash collection on delivery',
    price: 150.00,
    category: 'Payment',
    features: [
      'Cash collection on delivery',
      'Secure money handling',
      'Payment verification',
      'Daily settlement'
    ]
  },
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
  },
  {
    name: 'Cargo Shipment',
    description: 'Fee for bulk cargo and freight shipment services',
    price: 5000.00,
    category: 'Logistics',
    features: [
      'Bulk cargo handling',
      'Freight forwarding',
      'Customs clearance support',
      'End-to-end logistics management'
    ]
  }
]

async function seedSJServices() {
  try {
    console.log('Starting SJ Services seeding...')

    // Check if services already exist
    const existingServices = await prisma.service.findMany()
    if (existingServices.length > 0) {
      console.log(`Found ${existingServices.length} existing services. Updating instead of replacing...`)
      
      // Update existing services or create new ones
      for (const service of sjServices) {
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
          console.log(`Updated service: ${service.name}`)
        } else {
          await prisma.service.create({
            data: {
              ...service,
              features: service.features,
              isActive: true
            }
          })
          console.log(`Created service: ${service.name}`)
        }
      }
    } else {
      // Create new services
      for (const service of sjServices) {
        await prisma.service.create({
          data: {
            ...service,
            features: service.features,
            isActive: true
          }
        })
        console.log(`Created service: ${service.name}`)
      }
    }

    console.log('SJ Services seeding completed successfully!')
    console.log(`Created ${sjServices.length} services`)

    // Display summary
    const services = await prisma.service.findMany({
      select: {
        name: true,
        category: true,
        price: true
      },
      orderBy: { category: 'asc' }
    })

    console.log('\n=== SJ Services Summary ===')
    const categories = [...new Set(services.map(s => s.category))]
    
    categories.forEach(category => {
      console.log(`\n${category}:`)
      services
        .filter(s => s.category === category)
        .forEach(service => {
          console.log(`  - ${service.name}: ₦${service.price.toLocaleString()}`)
        })
    })

    const totalDailyRevenue = services.reduce((sum, s) => sum + Number(s.price), 0)
    console.log(`\nTotal Daily Revenue Potential: ₦${totalDailyRevenue.toLocaleString()}`)

  } catch (error) {
    console.error('Error seeding SJ Services:', error)
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