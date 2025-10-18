import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().default('Nigeria'),
    postalCode: z.string().optional(),
    landmark: z.string().optional()
  }),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive')
  })).min(1, 'At least one item is required'),
  deliveryFee: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(['COD', 'PREPAID', 'WALLET']).optional().default('COD'),
  notes: z.string().optional(),
  externalOrderId: z.string().optional(), // For tracking external platform order ID
  expectedDelivery: z.string().datetime().optional()
})

// GET /api/external/orders - List orders for external API
export const GET = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'orders:read')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/orders',
        'GET',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100 per page
    const status = searchParams.get('status')
    const paymentMethod = searchParams.get('paymentMethod')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      merchantId: apiKey.merchantId
    }

    if (status) where.status = status
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          shippingAddress: true,
          orderValue: true,
          deliveryFee: true,
          totalAmount: true,
          paymentMethod: true,
          status: true,
          notes: true,
          trackingNumber: true,
          expectedDelivery: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  description: true,
                  category: true,
                  brand: true,
                  unitPrice: true,
                  images: true
                }
              }
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ])

    const response = {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/orders',
      'GET',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      response
    )

    return createResponse(response, 200, 'Orders retrieved successfully')
  } catch (error) {
    console.error('External get orders error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/orders',
      'GET',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to retrieve orders', 500)
  }
})

// POST /api/external/orders - Create order via external API
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'orders:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/orders',
        'POST',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)

    // Generate order number
    const orderNumber = `EXT-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`

    // Calculate total amount
    const itemsTotal = validatedData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const totalAmount = itemsTotal + validatedData.deliveryFee

    // Validate products exist and belong to merchant
    const productIds = validatedData.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        merchantId: apiKey.merchantId,
        isActive: true
      },
      select: { id: true, sku: true, name: true }
    })

    if (products.length !== productIds.length) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/orders',
        'POST',
        400,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Some products not found or inactive'
      )
      return createErrorResponse('Some products not found or inactive', 400)
    }

    // Check stock availability
    const stockChecks = await Promise.all(
      validatedData.items.map(async (item) => {
        const stockItems = await prisma.stockItem.findMany({
          where: {
            productId: item.productId,
            availableQuantity: { gte: item.quantity }
          },
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          },
          orderBy: { availableQuantity: 'desc' }
        })

        return {
          item,
          warehouses: stockItems
        }
      })
    )

    // Check if all items have sufficient stock
    const insufficientStock = stockChecks.some(
      (check) => check.warehouses.length === 0
    )

    if (insufficientStock) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/orders',
        'POST',
        400,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Insufficient stock for some items'
      )
      return createErrorResponse('Insufficient stock for some items', 400)
    }

    // Create order
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        merchantId: apiKey.merchantId,
        customerName: validatedData.customerName,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone,
        shippingAddress: validatedData.shippingAddress,
        orderValue: itemsTotal,
        deliveryFee: validatedData.deliveryFee,
        totalAmount,
        paymentMethod: validatedData.paymentMethod,
        notes: validatedData.notes,
        expectedDelivery: validatedData.expectedDelivery ? new Date(validatedData.expectedDelivery) : null,
        orderItems: {
          create: validatedData.items.map((item) => ({
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
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                description: true,
                category: true,
                brand: true,
                unitPrice: true,
                images: true
              }
            }
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true
          }
        }
      }
    })

    // Reserve stock
    for (const check of stockChecks) {
      let remainingQuantity = check.item.quantity

      for (const stockItem of check.warehouses) {
        if (remainingQuantity <= 0) break

        const reserveAmount = Math.min(
          remainingQuantity,
          stockItem.availableQuantity
        )

        await prisma.stockItem.update({
          where: { id: stockItem.id },
          data: {
            reservedQuantity: { increment: reserveAmount },
            availableQuantity: { decrement: reserveAmount }
          }
        })

        // Create stock movement
        await prisma.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            movementType: 'STOCK_OUT',
            quantity: reserveAmount,
            referenceType: 'ORDER',
            referenceId: newOrder.id,
            notes: `Reserved for external order ${newOrder.orderNumber}`
          }
        })

        remainingQuantity -= reserveAmount
      }
    }

    // Create order status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: newOrder.id,
        status: 'PENDING',
        notes: 'Order created via external API'
      }
    })

    const response = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail,
      customerPhone: newOrder.customerPhone,
      shippingAddress: newOrder.shippingAddress,
      orderValue: newOrder.orderValue,
      deliveryFee: newOrder.deliveryFee,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.status,
      notes: newOrder.notes,
      trackingNumber: newOrder.trackingNumber,
      expectedDelivery: newOrder.expectedDelivery,
      createdAt: newOrder.createdAt,
      updatedAt: newOrder.updatedAt,
      orderItems: newOrder.orderItems,
      warehouse: newOrder.warehouse
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/orders',
      'POST',
      201,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      response
    )

    return createResponse(response, 201, 'Order created successfully')
  } catch (error) {
    console.error('External create order error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/orders',
      'POST',
      statusCode,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      errorMessage
    )

    return createErrorResponse(errorMessage, statusCode)
  }
})
