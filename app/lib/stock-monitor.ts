import { prisma } from './prisma'
import { notificationService, NotificationTemplates } from './notification-service'

class StockMonitor {
  /**
   * Check for low stock items and send notifications
   */
  async checkLowStock() {
    try {
      console.log('Checking for low stock items...')
      
      // Find all stock items that are low or out of stock
      const lowStockItems = await prisma.stockItem.findMany({
        where: {
          OR: [
            // Low stock: available quantity <= reorder level
            {
              availableQuantity: {
                lte: prisma.stockItem.fields.reorderLevel
              }
            },
            // Out of stock: available quantity = 0
            {
              availableQuantity: 0
            }
          ]
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              merchantId: true
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (lowStockItems.length === 0) {
        console.log('No low stock items found')
        return
      }

      console.log(`Found ${lowStockItems.length} low stock items`)

      // Group by merchant to send targeted notifications
      const merchantGroups = lowStockItems.reduce((groups, item) => {
        const merchantId = item.product.merchantId
        if (!groups[merchantId]) {
          groups[merchantId] = []
        }
        groups[merchantId].push(item)
        return groups
      }, {} as Record<string, typeof lowStockItems>)

      // Send notifications for each merchant
      for (const [merchantId, items] of Object.entries(merchantGroups)) {
        const outOfStockItems = items.filter(item => item.availableQuantity === 0)
        const lowStockItems = items.filter(item => item.availableQuantity > 0 && item.availableQuantity <= item.reorderLevel)

        // Send out of stock notifications
        for (const item of outOfStockItems) {
          await notificationService.createRoleNotification({
            ...NotificationTemplates.STOCK_OUT(item.product.name),
            recipientRole: 'MERCHANT_ADMIN',
            metadata: {
              productId: item.product.id,
              productName: item.product.name,
              sku: item.product.sku,
              warehouseId: item.warehouse.id,
              warehouseName: item.warehouse.name,
              currentStock: item.availableQuantity,
              reorderLevel: item.reorderLevel,
              merchantId: merchantId
            }
          })
        }

        // Send low stock notifications
        for (const item of lowStockItems) {
          await notificationService.createRoleNotification({
            ...NotificationTemplates.STOCK_LOW(
              item.product.name,
              item.availableQuantity,
              item.reorderLevel
            ),
            recipientRole: 'MERCHANT_ADMIN',
            metadata: {
              productId: item.product.id,
              productName: item.product.name,
              sku: item.product.sku,
              warehouseId: item.warehouse.id,
              warehouseName: item.warehouse.name,
              currentStock: item.availableQuantity,
              reorderLevel: item.reorderLevel,
              merchantId: merchantId
            }
          })
        }

        // Send warehouse staff notifications for critical stock levels
        const criticalItems = items.filter(item => item.availableQuantity <= 5)
        if (criticalItems.length > 0) {
          await notificationService.createRoleNotification({
            title: 'Critical Stock Alert',
            message: `${criticalItems.length} items are critically low in stock and need immediate attention`,
            type: 'WAREHOUSE_ALERT',
            priority: 'URGENT',
            recipientRole: 'WAREHOUSE_STAFF',
            metadata: {
              merchantId: merchantId,
              criticalItems: criticalItems.map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                sku: item.product.sku,
                currentStock: item.availableQuantity,
                warehouseName: item.warehouse.name
              }))
            }
          })
        }
      }

      console.log(`Stock monitoring completed. Processed ${lowStockItems.length} items`)
    } catch (error) {
      console.error('Error in stock monitoring:', error)
    }
  }

  /**
   * Check for expired products and send notifications
   */
  async checkExpiredProducts() {
    try {
      console.log('Checking for expired products...')
      
      const expiredItems = await prisma.stockItem.findMany({
        where: {
          expiryDate: {
            lte: new Date()
          },
          availableQuantity: {
            gt: 0
          }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              merchantId: true
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (expiredItems.length === 0) {
        console.log('No expired products found')
        return
      }

      console.log(`Found ${expiredItems.length} expired products`)

      // Group by merchant
      const merchantGroups = expiredItems.reduce((groups, item) => {
        const merchantId = item.product.merchantId
        if (!groups[merchantId]) {
          groups[merchantId] = []
        }
        groups[merchantId].push(item)
        return groups
      }, {} as Record<string, typeof expiredItems>)

      // Send notifications for each merchant
      for (const [merchantId, items] of Object.entries(merchantGroups)) {
        await notificationService.createRoleNotification({
          title: 'Expired Products Alert',
          message: `${items.length} products have expired and need to be removed from inventory`,
          type: 'WAREHOUSE_ALERT',
          priority: 'HIGH',
          recipientRole: 'MERCHANT_ADMIN',
          metadata: {
            merchantId: merchantId,
            expiredItems: items.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              sku: item.product.sku,
              expiryDate: item.expiryDate,
              quantity: item.availableQuantity,
              warehouseName: item.warehouse.name
            }))
          }
        })

        // Also notify warehouse staff
        await notificationService.createRoleNotification({
          title: 'Expired Products Removal Required',
          message: `${items.length} expired products need to be removed from warehouse inventory`,
          type: 'WAREHOUSE_ALERT',
          priority: 'HIGH',
          recipientRole: 'WAREHOUSE_STAFF',
          metadata: {
            merchantId: merchantId,
            expiredItems: items.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              sku: item.product.sku,
              expiryDate: item.expiryDate,
              quantity: item.availableQuantity,
              warehouseName: item.warehouse.name
            }))
          }
        })
      }

      console.log(`Expired products check completed. Processed ${expiredItems.length} items`)
    } catch (error) {
      console.error('Error checking expired products:', error)
    }
  }

  /**
   * Run all stock monitoring checks
   */
  async runAllChecks() {
    console.log('Starting stock monitoring checks...')
    await Promise.all([
      this.checkLowStock(),
      this.checkExpiredProducts()
    ])
    console.log('Stock monitoring checks completed')
  }
}

export const stockMonitor = new StockMonitor()
