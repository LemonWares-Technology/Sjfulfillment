import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'PICKED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'CONFIRMED']),
  notes: z.string().optional(),
  trackingNumber: z.string().optional()
})

// GET /api/external/orders/[id] - Get specific order
export const GET = withApiKey(async (request: NextRequest, apiKey, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now()
  
  try {
    const { id: orderId } = await params

    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'orders:read')) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/orders/${orderId}`,
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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: apiKey.merchantId
      },
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
        },
        statusHistory: {
          select: {
            id: true,
            status: true,
            notes: true,
            updatedBy: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/orders/${orderId}`,
        'GET',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Order not found'
      )
      return createErrorResponse('Order not found', 404)
    }

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/orders/${orderId}`,
      'GET',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      order
    )

    return createResponse(order, 200, 'Order retrieved successfully')
  } catch (error) {
    console.error('External get order error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/orders/${orderId}`,
      'GET',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to retrieve order', 500)
  }
})

// PUT /api/external/orders/[id] - Update order status
export const PUT = withApiKey(async (request: NextRequest, apiKey, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now()
  
  try {
    const { id: orderId } = await params

    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'orders:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/orders/${orderId}`,
        'PUT',
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
    const validatedData = updateOrderStatusSchema.parse(body)

    // Check if order exists and belongs to merchant
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: apiKey.merchantId
      }
    })

    if (!existingOrder) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/orders/${orderId}`,
        'PUT',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Order not found'
      )
      return createErrorResponse('Order not found', 404)
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: validatedData.status,
        trackingNumber: validatedData.trackingNumber,
        deliveredAt: validatedData.status === 'DELIVERED' ? new Date() : null
      },
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
      }
    })

    // Create status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: orderId,
        status: validatedData.status,
        notes: validatedData.notes || `Status updated via external API`,
        updatedBy: `API_KEY_${apiKey.apiKeyId}`
      }
    })

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/orders/${orderId}`,
      'PUT',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      updatedOrder
    )

    return createResponse(updatedOrder, 200, 'Order updated successfully')
  } catch (error) {
    console.error('External update order error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/orders/${orderId}`,
      'PUT',
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
