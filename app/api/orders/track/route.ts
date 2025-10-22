import { NextRequest } from "next/server"
import { prisma } from "@/app/lib/prisma"
import { createErrorResponse, createResponse } from "@/app/lib/api-utils"

// GET /api/orders/track - Public endpoint for tracking orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const trackingNumber = searchParams.get("trackingNumber")

    if (!orderId && !trackingNumber) {
      return createErrorResponse("Order ID or tracking number is required", 400)
    }

    const where: any = {}
    if (orderId) {
      where.id = orderId
    } else if (trackingNumber) {
      where.trackingNumber = trackingNumber
    }

    const order = await prisma.order.findFirst({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        shippingAddress: true,
        orderValue: true,
        deliveryFee: true,
        totalAmount: true,
        paymentMethod: true,
        trackingNumber: true,
        notes: true,
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
                name: true,
                sku: true
              }
            }
          }
        },
        merchant: {
          select: {
            businessName: true,
            address: true,
            businessPhone: true,
            businessEmail: true
          }
        },
        statusHistory: {
          select: {
            status: true,
            notes: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!order) {
      return createErrorResponse("Order not found", 404)
    }

    // Format the response
    const formattedOrder = {
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      orderValue: order.orderValue,
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderItems: order.orderItems.map((item: any) => ({
        id: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })),
      merchant: {
        businessName: order.merchant.businessName,
        businessAddress: order.merchant.address,
        businessPhone: order.merchant.businessPhone,
        businessEmail: order.merchant.businessEmail
      },
      statusHistory: order.statusHistory
    }

    return createResponse(formattedOrder, 200)
  } catch (error) {
    console.error("Track order error:", error)
    return createErrorResponse("Failed to fetch order details", 500)
  }
}
