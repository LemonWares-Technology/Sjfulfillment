import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/analytics
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('end') || new Date().toISOString()

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Build where clause based on user role
    const whereClause: any = {
      createdAt: {
        gte: start,
        lte: end
      }
    }

    if (user.role === 'MERCHANT_ADMIN' && user.merchantId) {
      whereClause.merchantId = user.merchantId
    }

    // Overview metrics
    const [
      totalOrders,
      totalRevenue,
      totalProducts,
      totalCustomers,
      previousPeriodOrders,
      previousPeriodRevenue
    ] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.aggregate({
        where: whereClause,
        _sum: { totalAmount: true }
      }),
      prisma.product.count({
        where: user.role === 'MERCHANT_ADMIN' && user.merchantId ? { merchantId: user.merchantId } : {}
      }),
      prisma.order.groupBy({
        by: ['customerEmail'],
        where: whereClause,
        _count: { customerEmail: true }
      }),
      prisma.order.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(start.getTime() - (end.getTime() - start.getTime())),
            lt: start
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(start.getTime() - (end.getTime() - start.getTime())),
            lt: start
          }
        },
        _sum: { totalAmount: true }
      })
    ])

    const orderGrowth = previousPeriodOrders > 0 
      ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100 
      : 0

    const revenueGrowth = previousPeriodRevenue._sum.totalAmount 
      ? ((Number(totalRevenue._sum.totalAmount || 0) - Number(previousPeriodRevenue._sum.totalAmount)) / Number(previousPeriodRevenue._sum.totalAmount)) * 100 
      : 0

    // Daily orders data
    const dailyOrders = user.role === 'MERCHANT_ADMIN' && user.merchantId 
      ? await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "merchantId" = ${user.merchantId}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      : await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `

    // Monthly orders data
    const monthlyOrders = user.role === 'MERCHANT_ADMIN' && user.merchantId
      ? await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "merchantId" = ${user.merchantId}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC
        `
      : await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC
        `

    // Order status distribution
    const statusDistribution = await prisma.order.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { status: true }
    })

    // Top selling products
    const topSellingProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: whereClause
      },
      _sum: { quantity: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10
    })

    const topSellingProductsWithDetails = await Promise.all(
      topSellingProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true, unitPrice: true }
        })
        return {
          name: product?.name || 'Unknown Product',
          sku: product?.sku || 'N/A',
          quantity: item._sum.quantity || 0,
          revenue: (item._sum.quantity || 0) * Number(product?.unitPrice || 0)
        }
      })
    )

    // Low stock products
    const lowStockProducts = await prisma.stockItem.findMany({
      where: {
        quantity: { lt: 10 }, // Assuming 10 is minimum stock
        product: user.role === 'MERCHANT_ADMIN' && user.merchantId ? { merchantId: user.merchantId } : {}
      },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      },
      take: 10
    })

    // Product categories
    const productCategories = await prisma.product.groupBy({
      by: ['category'],
      where: user.role === 'MERCHANT_ADMIN' && user.merchantId ? { merchantId: user.merchantId } : {},
      _count: { category: true }
    })

    // Top customers
    const topCustomers = await prisma.order.groupBy({
      by: ['customerEmail', 'customerName'],
      where: whereClause,
      _count: { customerEmail: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10
    })

    // New customers (first order in period)
    const newCustomers = user.role === 'MERCHANT_ADMIN' && user.merchantId
      ? await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(DISTINCT "customerEmail") as count
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "merchantId" = ${user.merchantId}
          AND "customerEmail" NOT IN (
            SELECT DISTINCT "customerEmail" 
            FROM orders 
            WHERE "createdAt" < ${start}
            AND "merchantId" = ${user.merchantId}
          )
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      : await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(DISTINCT "customerEmail") as count
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "customerEmail" NOT IN (
            SELECT DISTINCT "customerEmail" 
            FROM orders 
            WHERE "createdAt" < ${start}
          )
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `

    // Revenue by payment method
    const revenueByPaymentMethod = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: whereClause,
      _sum: { totalAmount: true },
      _count: { paymentMethod: true }
    })

    // Daily revenue
    const dailyRevenue = user.role === 'MERCHANT_ADMIN' && user.merchantId
      ? await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            SUM("totalAmount") as amount
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "merchantId" = ${user.merchantId}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      : await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            SUM("totalAmount") as amount
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `

    // Monthly revenue
    const monthlyRevenue = user.role === 'MERCHANT_ADMIN' && user.merchantId
      ? await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            SUM("totalAmount") as amount
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          AND "merchantId" = ${user.merchantId}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC
        `
      : await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            SUM("totalAmount") as amount
          FROM orders 
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC
        `

    const analyticsData = {
      overview: {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        totalProducts,
        totalCustomers: totalCustomers.length,
        orderGrowth: Math.round(orderGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100
      },
      orders: {
        daily: (dailyOrders as any[]).map(item => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count),
          revenue: Number(item.revenue || 0)
        })),
        monthly: (monthlyOrders as any[]).map(item => ({
          month: item.month.toISOString().split('T')[0],
          count: Number(item.count),
          revenue: Number(item.revenue || 0)
        })),
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: item._count.status
        }))
      },
      products: {
        topSelling: topSellingProductsWithDetails,
        lowStock: lowStockProducts.map(item => ({
          name: item.product.name,
          sku: item.product.sku,
          currentStock: item.quantity,
          minStock: 10
        })),
        categories: productCategories.map(item => ({
          category: item.category || 'Uncategorized',
          count: item._count.category,
          revenue: 0 // Would need additional query to calculate
        }))
      },
      customers: {
        newCustomers: (newCustomers as any[]).map(item => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count)
        })),
        topCustomers: topCustomers.map(item => ({
          name: item.customerName,
          email: item.customerEmail,
          orderCount: item._count.customerEmail,
          totalSpent: Number(item._sum.totalAmount || 0)
        }))
      },
      revenue: {
        daily: (dailyRevenue as any[]).map(item => ({
          date: item.date.toISOString().split('T')[0],
          amount: Number(item.amount || 0)
        })),
        monthly: (monthlyRevenue as any[]).map(item => ({
          month: item.month.toISOString().split('T')[0],
          amount: Number(item.amount || 0)
        })),
        byPaymentMethod: revenueByPaymentMethod.map(item => ({
          method: item.paymentMethod,
          amount: Number(item._sum.totalAmount || 0),
          count: item._count.paymentMethod
        }))
      }
    }

    return createResponse(analyticsData, 200, 'Analytics data retrieved successfully')

  } catch (error) {
    console.error('Get analytics error:', error)
    return createErrorResponse('Failed to retrieve analytics data', 500)
  }
})

