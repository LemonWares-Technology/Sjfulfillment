import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function createStockItems() {
  try {
    console.log('Creating stock items for existing products...')

    // Get all products that don't have stock items
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

    // Get any active warehouse as fallback
    const fallbackWarehouse = await prisma.warehouseLocation.findFirst({
      where: { isActive: true }
    })

    if (!fallbackWarehouse) {
      console.log('No active warehouses found. Creating a default warehouse...')
      
      // Create a default warehouse
      const defaultWarehouse = await prisma.warehouseLocation.create({
        data: {
          name: 'Lagos Island Warehouse',
          code: 'WH-LAG-001',
          address: 'Lagos Island Warehouse',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          isActive: true
        }
      })
      
      console.log('Created default warehouse:', defaultWarehouse.id)
    }

    const warehouse = fallbackWarehouse || await prisma.warehouseLocation.findFirst({
      where: { isActive: true }
    })

    if (!warehouse) {
      console.error('No warehouse available for stock creation')
      return
    }

    console.log('Using warehouse:', warehouse.name, warehouse.id)

    // Create stock items for products
    let createdCount = 0
    for (const product of productsWithoutStock) {
      try {
        // Use merchant's warehouse if available, otherwise use fallback
        const targetWarehouse = product.merchant?.warehouses[0] || warehouse
        
        const stockItem = await prisma.stockItem.create({
          data: {
            productId: product.id,
            warehouseId: targetWarehouse.id,
            quantity: 0, // Start with 0 stock
            availableQuantity: 0,
            reservedQuantity: 0,
            reorderLevel: 10, // Default reorder level
            maxStockLevel: 100 // Default max stock level
          }
        })
        
        console.log(`Created stock item for product: ${product.name} (${product.sku})`)
        createdCount++
      } catch (error) {
        console.error(`Failed to create stock for product ${product.name}:`, error)
      }
    }

    console.log(`Successfully created ${createdCount} stock items`)

    // Display summary
    const totalStockItems = await prisma.stockItem.count()
    const totalProducts = await prisma.product.count()
    
    // console.log('\n=== Stock Items Summary ===')
    // console.log(`Total Products: ${totalProducts}`)
    // console.log(`Total Stock Items: ${totalStockItems}`)
    // console.log(`Products without stock: ${totalProducts - totalStockItems}`)

  } catch (error) {
    console.error('Error creating stock items:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  createStockItems()
    .then(() => {
      console.log('Stock items creation completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Stock items creation failed:', error)
      process.exit(1)
    })
}

export default createStockItems

