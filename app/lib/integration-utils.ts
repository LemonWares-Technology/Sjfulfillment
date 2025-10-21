import { PaymentMethod } from '../generated/prisma'
import { prisma } from './prisma'
import { triggerWebhooks, WEBHOOK_EVENTS } from './webhook-service'

/**
 * WooCommerce Integration Utilities
 */
export class WooCommerceIntegration {
  /**
   * Sync product from WooCommerce to SJFulfillment
   */
  static async syncProductFromWooCommerce(
    merchantId: string,
    wooProduct: any
  ): Promise<any> {
    try {
      // Map WooCommerce product to SJFulfillment format
      const productData = {
        name: wooProduct.name,
        description: wooProduct.description || wooProduct.short_description,
        category: wooProduct.categories?.[0]?.name || 'General',
        brand: wooProduct.attributes?.find((attr: any) => 
          attr.name.toLowerCase() === 'brand'
        )?.options?.[0] || null,
        weight: wooProduct.weight ? parseFloat(wooProduct.weight) : null,
        unitPrice: wooProduct.price ? parseFloat(wooProduct.price) : null,
        images: wooProduct.images?.map((img: any) => img.src) || [],
        sku: wooProduct.sku || `WC-${wooProduct.id}`,
        quantity: wooProduct.stock_quantity || 0
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          merchantId,
          sku: productData.sku
        },
        include: {
          stockItems: true
        }
      })

      let product
      if (existingProduct) {
        // Update existing product
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: productData.name,
            description: productData.description,
            category: productData.category,
            brand: productData.brand,
            weight: productData.weight,
            unitPrice: productData.unitPrice,
            images: productData.images
          }
        })

        // Update stock if quantity changed
        if (productData.quantity !== existingProduct.stockItems?.[0]?.quantity) {
          await this.updateStockFromWooCommerce(merchantId, product.id, productData.quantity)
        }
      } else {
        // Create new product
        product = await prisma.product.create({
          data: {
            ...productData,
            merchantId
          }
        })

        // Add initial stock
        if (productData.quantity > 0) {
          await this.updateStockFromWooCommerce(merchantId, product.id, productData.quantity)
        }
      }

      // Trigger webhook
      await triggerWebhooks(
        merchantId,
        existingProduct ? WEBHOOK_EVENTS.PRODUCT_UPDATED : WEBHOOK_EVENTS.PRODUCT_CREATED,
        product
      )

      return product
    } catch (error) {
      console.error('Error syncing WooCommerce product:', error)
      throw error
    }
  }

  /**
   * Update stock from WooCommerce
   */
  static async updateStockFromWooCommerce(
    merchantId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    try {
      // Get merchant's primary warehouse
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          warehouses: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      })

      if (!merchant?.warehouses[0]) {
        throw new Error('No active warehouse found for merchant')
      }

      const warehouseId = merchant.warehouses[0].id

      // Find or create stock item
      let stockItem = await prisma.stockItem.findFirst({
        where: {
          productId,
          warehouseId
        }
      })

      if (!stockItem) {
        stockItem = await prisma.stockItem.create({
          data: {
            productId,
            warehouseId,
            quantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0
          }
        })
      }

      // Calculate difference and update
      const difference = quantity - stockItem.quantity
      if (difference !== 0) {
        const movementType = difference > 0 ? 'STOCK_IN' : 'STOCK_OUT'
        
        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: {
            quantity,
            availableQuantity: Math.max(0, quantity - stockItem.reservedQuantity),
            lastStockIn: movementType === 'STOCK_IN' ? new Date() : stockItem.lastStockIn,
            lastStockOut: movementType === 'STOCK_OUT' ? new Date() : stockItem.lastStockOut
          }
        })

        // Create stock movement
        await prisma.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            movementType,
            quantity: Math.abs(difference),
            referenceType: 'WOOCOMMERCE_SYNC',
            referenceId: productId,
            notes: `Stock synced from WooCommerce`
          }
        })

        // Trigger webhook
        await triggerWebhooks(
          merchantId,
          WEBHOOK_EVENTS.INVENTORY_UPDATED,
          {
            productId,
            warehouseId,
            quantity,
            movementType,
            difference: Math.abs(difference)
          }
        )
      }
    } catch (error) {
      console.error('Error updating stock from WooCommerce:', error)
      throw error
    }
  }

  /**
   * Create order from WooCommerce
   */
  static async createOrderFromWooCommerce(
    merchantId: string,
    wooOrder: any
  ): Promise<any> {
    try {
      // Map WooCommerce order to SJFulfillment format
      const orderData = {
        customerName: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
        customerEmail: wooOrder.billing.email,
        customerPhone: wooOrder.billing.phone,
        shippingAddress: {
          street: wooOrder.shipping.address_1,
          city: wooOrder.shipping.city,
          state: wooOrder.shipping.state,
          country: wooOrder.shipping.country,
          postalCode: wooOrder.shipping.postcode
        },
        items: wooOrder.line_items.map((item: any) => ({
          productId: item.product_id, // This should be mapped to SJFulfillment product ID
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })),
        deliveryFee: parseFloat(wooOrder.shipping_total || '0'),
        paymentMethod: wooOrder.payment_method === 'cod' ? 'COD' : 'PREPAID',
        notes: `WooCommerce Order #${wooOrder.id}`,
        externalOrderId: wooOrder.id.toString()
      }

      // Generate order number
      const orderNumber = `WC-${wooOrder.id}-${Date.now()}`

      // Calculate total amount
      const itemsTotal = orderData.items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      )
      const totalAmount = itemsTotal + orderData.deliveryFee

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          merchantId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          shippingAddress: orderData.shippingAddress,
          orderValue: itemsTotal,
          deliveryFee: orderData.deliveryFee,
          totalAmount,
          paymentMethod: orderData.paymentMethod as PaymentMethod,
          notes: orderData.notes,
          orderItems: {
            create: orderData.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      // Create order status history
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'PENDING',
          notes: 'Order created from WooCommerce'
        }
      })

      // Trigger webhook
      await triggerWebhooks(
        merchantId,
        WEBHOOK_EVENTS.ORDER_CREATED,
        order
      )

      return order
    } catch (error) {
      console.error('Error creating order from WooCommerce:', error)
      throw error
    }
  }
}

/**
 * Shopify Integration Utilities
 */
export class ShopifyIntegration {
  /**
   * Sync product from Shopify to SJFulfillment
   */
  static async syncProductFromShopify(
    merchantId: string,
    shopifyProduct: any
  ): Promise<any> {
    try {
      // Map Shopify product to SJFulfillment format
      const productData = {
        name: shopifyProduct.title,
        description: shopifyProduct.body_html?.replace(/<[^>]*>/g, '') || '',
        category: shopifyProduct.product_type || 'General',
        brand: shopifyProduct.vendor || null,
        weight: shopifyProduct.variants?.[0]?.weight ? 
          parseFloat(shopifyProduct.variants[0].weight) : null,
        unitPrice: shopifyProduct.variants?.[0]?.price ? 
          parseFloat(shopifyProduct.variants[0].price) : null,
        images: shopifyProduct.images?.map((img: any) => img.src) || [],
        sku: shopifyProduct.variants?.[0]?.sku || `SHOP-${shopifyProduct.id}`,
        quantity: shopifyProduct.variants?.[0]?.inventory_quantity || 0
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          merchantId,
          sku: productData.sku
        },
        include: {
          stockItems: true
        }
      })

      let product
      if (existingProduct) {
        // Update existing product
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: productData.name,
            description: productData.description,
            category: productData.category,
            brand: productData.brand,
            weight: productData.weight,
            unitPrice: productData.unitPrice,
            images: productData.images
          }
        })

        // Update stock if quantity changed
        if (productData.quantity !== existingProduct.stockItems?.[0]?.quantity) {
          await this.updateStockFromShopify(merchantId, product.id, productData.quantity)
        }
      } else {
        // Create new product
        product = await prisma.product.create({
          data: {
            ...productData,
            merchantId
          }
        })

        // Add initial stock
        if (productData.quantity > 0) {
          await this.updateStockFromShopify(merchantId, product.id, productData.quantity)
        }
      }

      // Trigger webhook
      await triggerWebhooks(
        merchantId,
        existingProduct ? WEBHOOK_EVENTS.PRODUCT_UPDATED : WEBHOOK_EVENTS.PRODUCT_CREATED,
        product
      )

      return product
    } catch (error) {
      console.error('Error syncing Shopify product:', error)
      throw error
    }
  }

  /**
   * Update stock from Shopify
   */
  static async updateStockFromShopify(
    merchantId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    try {
      // Get merchant's primary warehouse
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          warehouses: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      })

      if (!merchant?.warehouses[0]) {
        throw new Error('No active warehouse found for merchant')
      }

      const warehouseId = merchant.warehouses[0].id

      // Find or create stock item
      let stockItem = await prisma.stockItem.findFirst({
        where: {
          productId,
          warehouseId
        }
      })

      if (!stockItem) {
        stockItem = await prisma.stockItem.create({
          data: {
            productId,
            warehouseId,
            quantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0
          }
        })
      }

      // Calculate difference and update
      const difference = quantity - stockItem.quantity
      if (difference !== 0) {
        const movementType = difference > 0 ? 'STOCK_IN' : 'STOCK_OUT'
        
        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: {
            quantity,
            availableQuantity: Math.max(0, quantity - stockItem.reservedQuantity),
            lastStockIn: movementType === 'STOCK_IN' ? new Date() : stockItem.lastStockIn,
            lastStockOut: movementType === 'STOCK_OUT' ? new Date() : stockItem.lastStockOut
          }
        })

        // Create stock movement
        await prisma.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            movementType,
            quantity: Math.abs(difference),
            referenceType: 'SHOPIFY_SYNC',
            referenceId: productId,
            notes: `Stock synced from Shopify`
          }
        })

        // Trigger webhook
        await triggerWebhooks(
          merchantId,
          WEBHOOK_EVENTS.INVENTORY_UPDATED,
          {
            productId,
            warehouseId,
            quantity,
            movementType,
            difference: Math.abs(difference)
          }
        )
      }
    } catch (error) {
      console.error('Error updating stock from Shopify:', error)
      throw error
    }
  }

  /**
   * Create order from Shopify
   */
  static async createOrderFromShopify(
    merchantId: string,
    shopifyOrder: any
  ): Promise<any> {
    try {
      // Map Shopify order to SJFulfillment format
      const orderData = {
        customerName: `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`,
        customerEmail: shopifyOrder.customer.email,
        customerPhone: shopifyOrder.customer.phone || '',
        shippingAddress: {
          street: shopifyOrder.shipping_address.address1,
          city: shopifyOrder.shipping_address.city,
          state: shopifyOrder.shipping_address.province,
          country: shopifyOrder.shipping_address.country,
          postalCode: shopifyOrder.shipping_address.zip
        },
        items: shopifyOrder.line_items.map((item: any) => ({
          productId: item.product_id, // This should be mapped to SJFulfillment product ID
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })),
        deliveryFee: parseFloat(shopifyOrder.shipping_lines?.[0]?.price || '0'),
        paymentMethod: 'PREPAID', // Shopify orders are typically prepaid
        notes: `Shopify Order #${shopifyOrder.order_number}`,
        externalOrderId: shopifyOrder.id.toString()
      }

      // Generate order number
      const orderNumber = `SHOP-${shopifyOrder.order_number}-${Date.now()}`

      // Calculate total amount
      const itemsTotal = orderData.items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      )
      const totalAmount = itemsTotal + orderData.deliveryFee

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          merchantId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          shippingAddress: orderData.shippingAddress,
          orderValue: itemsTotal,
          deliveryFee: orderData.deliveryFee,
          totalAmount,
          paymentMethod: orderData.paymentMethod as PaymentMethod,
          notes: orderData.notes,
          orderItems: {
            create: orderData.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      // Create order status history
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'PENDING',
          notes: 'Order created from Shopify'
        }
      })

      // Trigger webhook
      await triggerWebhooks(
        merchantId,
        WEBHOOK_EVENTS.ORDER_CREATED,
        order
      )

      return order
    } catch (error) {
      console.error('Error creating order from Shopify:', error)
      throw error
    }
  }
}
