import { prisma } from './prisma'

export async function ensureDefaultWarehouse() {
  // Check if any active warehouse exists
  const existingWarehouse = await prisma.warehouseLocation.findFirst({
    where: { isActive: true }
  })

  if (existingWarehouse) {
    return existingWarehouse
  }

  // Create default warehouse if none exists
  console.log('No active warehouse found, creating default warehouse...')
  const defaultWarehouse = await prisma.warehouseLocation.create({
    data: {
      name: 'Main Warehouse',
      code: 'MAIN-001',
      address: 'Default Address',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      isActive: true,
      capacity: 10000
    }
  })

  console.log('Created default warehouse:', defaultWarehouse.name)
  return defaultWarehouse
}

export async function ensureProductStockItem(productId: string, quantity: number = 0) {
  // Check if product already has stock items
  const existingStockItems = await prisma.stockItem.findMany({
    where: { productId }
  })

  if (existingStockItems.length > 0) {
    return existingStockItems[0] // Return first stock item
  }

  // Get or create default warehouse
  const warehouse = await ensureDefaultWarehouse()

  // Create stock item for the product
  const stockItem = await prisma.stockItem.create({
    data: {
      productId,
      warehouseId: warehouse.id,
      quantity,
      availableQuantity: quantity,
      reservedQuantity: 0,
      reorderLevel: 10,
      maxStockLevel: 100
    }
  })

  console.log('Created stock item for product:', productId, 'in warehouse:', warehouse.name)
  return stockItem
}

