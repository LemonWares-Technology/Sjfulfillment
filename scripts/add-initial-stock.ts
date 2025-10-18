import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function addInitialStock() {
  try {
    console.log('Adding initial stock to products...')

    // Get all stock items with 0 quantity
    const stockItems = await prisma.stockItem.findMany({
      where: {
        quantity: 0
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true
          }
        }
      }
    })

    console.log(`Found ${stockItems.length} stock items with 0 quantity`)

    // Add random stock quantities based on product category
    const categoryStock = {
      'Electronics': { min: 5, max: 50 },
      'Clothing': { min: 10, max: 100 },
      'Shoes': { min: 5, max: 30 },
      'Accessories': { min: 15, max: 75 },
      'Books': { min: 20, max: 200 },
      'Home & Garden': { min: 8, max: 40 },
      'Sports': { min: 6, max: 25 },
      'Beauty': { min: 12, max: 60 },
      'Automotive': { min: 3, max: 15 },
      'Health': { min: 10, max: 50 },
      'Toys': { min: 8, max: 35 },
      'Office': { min: 5, max: 25 }
    }

    let updatedCount = 0
    for (const stockItem of stockItems) {
      try {
        const category = stockItem.product.category || 'Electronics'
        const stockRange = categoryStock[category as keyof typeof categoryStock] || categoryStock['Electronics']
        
        const quantity = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min
        const reorderLevel = Math.floor(quantity * 0.2) // 20% of stock as reorder level
        const maxStockLevel = Math.floor(quantity * 1.5) // 150% of current stock as max

        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: {
            quantity: quantity,
            availableQuantity: quantity,
            reservedQuantity: 0,
            reorderLevel: reorderLevel,
            maxStockLevel: maxStockLevel
          }
        })
        
        console.log(`Updated stock for ${stockItem.product.name}: ${quantity} units (reorder: ${reorderLevel})`)
        updatedCount++
      } catch (error) {
        console.error(`Failed to update stock for ${stockItem.product.name}:`, error)
      }
    }

    console.log(`Successfully updated ${updatedCount} stock items`)

    // Display summary
    const stockSummary = await prisma.stockItem.aggregate({
      _sum: {
        quantity: true,
        availableQuantity: true
      },
      _count: {
        id: true
      }
    })

    console.log('\n=== Stock Summary ===')
    console.log(`Total Stock Items: ${stockSummary._count.id}`)
    console.log(`Total Quantity: ${stockSummary._sum.quantity}`)
    console.log(`Total Available: ${stockSummary._sum.availableQuantity}`)

    // Show low stock items
    const lowStockItems = await prisma.stockItem.findMany({
      where: {
        availableQuantity: {
          lte: prisma.stockItem.fields.reorderLevel
        }
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

    console.log(`\nLow Stock Items (${lowStockItems.length}):`)
    lowStockItems.forEach(item => {
      console.log(`- ${item.product.name} (${item.product.sku}): ${item.availableQuantity} available (reorder: ${item.reorderLevel})`)
    })

  } catch (error) {
    console.error('Error adding initial stock:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  addInitialStock()
    .then(() => {
      console.log('Initial stock addition completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Initial stock addition failed:', error)
      process.exit(1)
    })
}

export default addInitialStock

