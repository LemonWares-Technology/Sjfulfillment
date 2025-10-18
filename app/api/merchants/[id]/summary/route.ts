import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/merchants/[id]/summary
export const GET = withRole(
  ["SJFS_ADMIN"],
  async (request: NextRequest, user: JWTPayload, { params }: { params: { id: string } }) => {
    try {
      const merchantId = params.id

      // Get merchant details
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              lastLogin: true
            }
          },
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitPrice: true,
              isActive: true
            }
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              customerName: true,
              customerEmail: true
            }
          }
        }
      })

      if (!merchant) {
        return createErrorResponse('Merchant not found', 404)
      }

      // Calculate order statistics
      const totalOrders = merchant.orders.length
      const deliveredOrders = merchant.orders.filter(order => order.status === 'DELIVERED').length
      const pendingOrders = merchant.orders.filter(order => ['PENDING', 'PROCESSING'].includes(order.status)).length
      const returnedOrders = merchant.orders.filter(order => order.status === 'RETURNED').length
      const cancelledOrders = merchant.orders.filter(order => order.status === 'CANCELLED').length

      // Calculate revenue statistics
      const totalRevenue = merchant.orders
        .filter(order => order.status === 'DELIVERED')
        .reduce((sum, order) => sum + Number(order.totalAmount), 0)

      const pendingRevenue = merchant.orders
        .filter(order => ['PENDING', 'PROCESSING'].includes(order.status))
        .reduce((sum, order) => sum + Number(order.totalAmount), 0)

      // Calculate percentages
      const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0
      const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0

      // Get recent orders (last 10)
      const recentOrders = merchant.orders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)

      // Get top products by order count
      const productOrderCounts = merchant.orders.reduce((acc, order) => {
        // This is simplified - in a real implementation you'd need to join with orderItems
        return acc
      }, {} as Record<string, number>)

      // Get monthly statistics (last 12 months)
      const monthlyStats = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const monthOrders = merchant.orders.filter(order => {
          const orderDate = new Date(order.createdAt)
          return orderDate >= startOfMonth && orderDate <= endOfMonth
        })

        const monthRevenue = monthOrders
          .filter(order => order.status === 'DELIVERED')
          .reduce((sum, order) => sum + Number(order.totalAmount), 0)

        monthlyStats.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          orders: monthOrders.length,
          revenue: monthRevenue
        })
      }

      // Get subscription information
      const subscriptions = await prisma.subscription.findMany({
        where: { merchantId },
        include: {
          servicePlan: {
            select: {
              name: true,
              basePrice: true
            }
          }
        }
      })

      // Get service subscriptions
      const serviceSubscriptions = await prisma.merchantServiceSubscription.findMany({
        where: { merchantId },
        include: {
          service: {
            select: {
              name: true,
              price: true,
              category: true
            }
          }
        }
      })

      const summary = {
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          businessEmail: merchant.businessEmail,
          businessPhone: merchant.businessPhone,
          address: merchant.address,
          city: merchant.city,
          state: merchant.state,
          country: merchant.country,
          cacNumber: merchant.cacNumber,
          taxId: merchant.taxId,
          onboardingStatus: merchant.onboardingStatus,
          createdAt: merchant.createdAt,
          updatedAt: merchant.updatedAt
        },
        users: merchant.users,
        products: {
          total: merchant.products.length,
          active: merchant.products.filter(p => p.isActive).length,
          inactive: merchant.products.filter(p => !p.isActive).length,
          list: merchant.products.slice(0, 10) // Show first 10 products
        },
        orders: {
          total: totalOrders,
          delivered: deliveredOrders,
          pending: pendingOrders,
          returned: returnedOrders,
          cancelled: cancelledOrders,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          returnRate: Math.round(returnRate * 100) / 100,
          cancellationRate: Math.round(cancellationRate * 100) / 100
        },
        revenue: {
          total: totalRevenue,
          pending: pendingRevenue,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        recentOrders,
        monthlyStats,
        subscriptions: {
          plans: subscriptions,
          services: serviceSubscriptions,
          totalMonthlyCost: serviceSubscriptions.reduce((sum, sub) => 
            sum + Number(sub.service.price) * sub.quantity, 0
          )
        },
        performance: {
          overallScore: Math.round(
            (deliveryRate * 0.4 + 
             (100 - returnRate) * 0.3 + 
             (100 - cancellationRate) * 0.3)
          ),
          status: deliveryRate >= 90 && returnRate <= 5 ? 'Excellent' :
                  deliveryRate >= 80 && returnRate <= 10 ? 'Good' :
                  deliveryRate >= 70 && returnRate <= 15 ? 'Fair' : 'Needs Improvement'
        }
      }

      return createResponse(summary, 200, 'Merchant summary retrieved successfully')
    } catch (error) {
      console.error('Merchant summary error:', error)
      return createErrorResponse('Failed to retrieve merchant summary', 500)
    }
  }
)

