import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/dashboard/stats
export const GET = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN", "MERCHANT_STAFF", "WAREHOUSE_STAFF"],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      // Build where clause based on user role
      const whereClause = user.role === "SJFS_ADMIN" ? {} : { merchantId: user.merchantId };

      const [
        totalMerchants,
        totalProducts,
        totalOrders,
        totalRevenue,
        activeSubscriptions,
        pendingOrders,
        lowStockItems,
        recentOrders,
      ] = await Promise.all([
        // Total merchants (admin only)
        user.role === "SJFS_ADMIN" 
          ? prisma.merchant.count() 
          : Promise.resolve(0),

        // Total products
        prisma.product.count({ where: whereClause }),

        // Total orders
        prisma.order.count({ where: whereClause }),

        // Total revenue
        prisma.order.aggregate({
          where: {
            ...whereClause,
            status: "DELIVERED",
          },
          _sum: {
            totalAmount: true,
          },
        }),

        // Active subscriptions
        user.role === "SJFS_ADMIN"
          ? prisma.subscription.count({ where: { status: "ACTIVE" } })
          : prisma.subscription.count({
              where: { merchantId: user.merchantId, status: "ACTIVE" },
            }),

        // Pending orders
        prisma.order.count({
          where: {
            ...whereClause,
            status: { in: ["PENDING", "PROCESSING"] },
          },
        }),

        // Low stock items
        prisma.stockItem.count({
          where: {
            quantity: { lte: prisma.stockItem.fields.reorderLevel },
            product: whereClause,
          },
        }),

        // Recent orders
        prisma.order.findMany({
          where: whereClause,
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true,
              },
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const stats = {
        totalMerchants,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        activeSubscriptions,
        pendingOrders,
        lowStockItems,
        recentOrders,
      };

      return createResponse(
        stats,
        200,
        "Dashboard stats retrieved successfully"
      );
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      return createErrorResponse("Failed to retrieve dashboard stats", 500);
    }
  }
);
