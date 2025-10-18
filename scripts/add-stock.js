const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addStock() {
  try {
    // Add stock for the Hello World product
    const stockItem = await prisma.stockItem.create({
      data: {
        productId: 'cmg2uvbdh000x22tlbiu59cvz', // Hello World product
        warehouseId: 'cmg262cfo0000hcqsff61ruag', // Lagos Island warehouse
        quantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0
      }
    })
    
    console.log('Stock item created:', stockItem)
  } catch (error) {
    console.error('Error creating stock item:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addStock()
