import { prisma } from './prisma'

// SJ Services data
const sjServices = [
  {
    name: "Warehouse Storage",
    description: "Secure storage solutions for your inventory",
    price: 5000,
    category: "Storage",
    features: ["24/7 Security", "Climate Control", "Inventory Management"]
  },
  {
    name: "Order Fulfillment",
    description: "Complete order processing and packaging",
    price: 3000,
    category: "Fulfillment",
    features: ["Pick & Pack", "Quality Control", "Custom Packaging"]
  },
  {
    name: "Last Mile Delivery",
    description: "Fast and reliable delivery to your customers",
    price: 2500,
    category: "Delivery",
    features: ["Same Day Delivery", "Real-time Tracking", "Proof of Delivery"]
  },
  {
    name: "Inventory Management",
    description: "Advanced inventory tracking and reporting",
    price: 2000,
    category: "Management",
    features: ["Real-time Stock Levels", "Automated Reordering", "Analytics Dashboard"]
  },
  {
    name: "Returns Processing",
    description: "Efficient returns and refund management",
    price: 1500,
    category: "Returns",
    features: ["Return Authorization", "Quality Inspection", "Refund Processing"]
  },
  {
    name: "Customer Support",
    description: "24/7 customer service and support",
    price: 4000,
    category: "Support",
    features: ["Multi-channel Support", "Order Tracking", "Issue Resolution"]
  },
  {
    name: "Bulk Operations",
    description: "Handle large volume operations efficiently",
    price: 8000,
    category: "Operations",
    features: ["Bulk Upload", "Batch Processing", "Automated Workflows"]
  },
  {
    name: "Analytics & Reporting",
    description: "Comprehensive business insights and reports",
    price: 3000,
    category: "Analytics",
    features: ["Custom Reports", "Performance Metrics", "Data Export"]
  }
]

export async function seedServices() {
  console.log('🌱 Seeding SJ Services...')
  
  try {
    // Check if services already exist
    const existingServices = await prisma.service.findMany()
    
    if (existingServices.length > 0) {
      console.log(`Found ${existingServices.length} existing services. Updating...`)
      
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
          console.log(`✅ Updated service: ${service.name}`)
        } else {
          await prisma.service.create({
            data: {
              ...service,
              features: service.features,
              isActive: true
            }
          })
          console.log(`✅ Created service: ${service.name}`)
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
        console.log(`✅ Created service: ${service.name}`)
      }
    }

    console.log(`✅ SJ Services seeding completed! Created/Updated ${sjServices.length} services`)
    return { success: true, message: `Seeded ${sjServices.length} services` }
  } catch (error) {
    console.error('❌ Error seeding services:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createDefaultWarehouse() {
  console.log('🏢 Creating default warehouse if none exists...')
  
  try {
    const existingWarehouses = await prisma.warehouseLocation.findMany()
    
    if (existingWarehouses.length === 0) {
      const warehouse = await prisma.warehouseLocation.create({
        data: {
          name: 'SJF Main Warehouse',
          code: 'WH-LAG-001',
          address: 'Lagos Main Warehouse',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          capacity: 10000,
          isActive: true
        }
      })
      console.log('✅ Created default warehouse: SJF Main Warehouse')
      return { success: true, message: 'Created default warehouse', warehouse }
    } else {
      console.log(`✅ Found ${existingWarehouses.length} existing warehouses`)
      return { success: true, message: `Found ${existingWarehouses.length} existing warehouses` }
    }
  } catch (error) {
    console.error('❌ Error creating default warehouse:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createStockItems() {
  console.log('📦 Creating stock items for existing products...')
  
  try {
    // Find products without stock items
    const productsWithoutStock = await prisma.product.findMany({
      where: {
        stockItems: {
          none: {}
        }
      },
      include: {
        merchant: {
          include: {
            warehouses: {
              where: { isActive: true },
              take: 1
            }
          }
        }
      }
    })

    console.log(`Found ${productsWithoutStock.length} products without stock items`)

    if (productsWithoutStock.length === 0) {
      console.log('✅ All products already have stock items')
      return { success: true, message: 'All products already have stock items' }
    }

    // Get any active warehouse as fallback
    const fallbackWarehouse = await prisma.warehouseLocation.findFirst({
      where: { isActive: true }
    })

    if (!fallbackWarehouse) {
      console.log('⚠️ No active warehouses found. Skipping stock item creation.')
      return { success: true, message: 'No active warehouses found. Skipped stock item creation.' }
    }

    let createdCount = 0
    for (const product of productsWithoutStock) {
      // Use merchant's warehouse or fallback to any warehouse
      const warehouse = product.merchant?.warehouses[0] || fallbackWarehouse
      
      await prisma.stockItem.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          reorderLevel: 10,
          maxStockLevel: 100
        }
      })
      createdCount++
      console.log(`✅ Created stock item for product: ${product.name}`)
    }

    console.log(`✅ Created ${createdCount} stock items`)
    return { success: true, message: `Created ${createdCount} stock items` }
  } catch (error) {
    console.error('❌ Error creating stock items:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function addInitialStock() {
  console.log('📊 Adding initial stock quantities...')
  
  try {
    const stockItemsWithZeroQuantity = await prisma.stockItem.findMany({
      where: {
        quantity: 0
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      }
    })

    console.log(`Found ${stockItemsWithZeroQuantity.length} stock items with 0 quantity`)

    if (stockItemsWithZeroQuantity.length === 0) {
      console.log('✅ All stock items already have quantities')
      return { success: true, message: 'All stock items already have quantities' }
    }

    let updatedCount = 0
    for (const stockItem of stockItemsWithZeroQuantity) {
      const randomQuantity = Math.floor(Math.random() * 100) + 5 // Random quantity between 5 and 104
      const randomReorderLevel = Math.floor(Math.random() * 20) + 1 // Random reorder level between 1 and 20

      await prisma.stockItem.update({
        where: { id: stockItem.id },
        data: {
          quantity: randomQuantity,
          availableQuantity: randomQuantity,
          reorderLevel: randomReorderLevel
        }
      })
      console.log(`✅ Updated stock for ${stockItem.product.name}: ${randomQuantity} units (reorder: ${randomReorderLevel})`)
      updatedCount++
    }

    console.log(`✅ Updated ${updatedCount} stock items with initial quantities`)
    return { success: true, message: `Updated ${updatedCount} stock items with initial quantities` }
  } catch (error) {
    console.error('❌ Error adding initial stock:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Main seeding function
export async function seedDatabase() {
  console.log('🚀 Starting database seeding...')
  console.log('=====================================')
  
  const results = {
    warehouse: null as any,
    services: null as any,
    stockItems: null as any,
    initialStock: null as any
  }
  
  try {
    // Run all seeding functions
    results.warehouse = await createDefaultWarehouse()
    results.services = await seedServices()
    results.stockItems = await createStockItems()
    results.initialStock = await addInitialStock()
    
    console.log('=====================================')
    console.log('🎉 Database seeding completed successfully!')
    
    // Display summary
    const services = await prisma.service.count()
    const products = await prisma.product.count()
    const stockItems = await prisma.stockItem.count()
    const warehouses = await prisma.warehouseLocation.count()
    
    console.log('\n📊 Seeding Summary:')
    console.log(`   Services: ${services}`)
    console.log(`   Products: ${products}`)
    console.log(`   Stock Items: ${stockItems}`)
    console.log(`   Warehouses: ${warehouses}`)
    
    return {
      success: true,
      message: 'Database seeding completed successfully',
      results,
      summary: {
        services,
        products,
        stockItems,
        warehouses
      }
    }
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }
  }
}

// Quick seed function for just services (your preferred approach)
export async function quickSeed() {
  console.log('🌱 Running quick seed (services only)...')
  return await seedServices()
}
