import { NextRequest } from "next/server";

import { JWTPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createErrorResponse,
  createResponse,
  withRole,
} from "@/app/lib/api-utils";
import { createMerchantSchema } from "@/app/lib/validations";

// GET /api/merchants
export const GET = withRole(
  ["SJFS_ADMIN"],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const status = searchParams.get("status");
      const city = searchParams.get("city");
      const state = searchParams.get("state");

      const where: any = {};
      if (status) where.onboardingStatus = status;
      if (city) where.city = city;
      if (state) where.state = state;

      const skip = (page - 1) * limit;

      const [merchants, total] = await Promise.all([
        prisma.merchant.findMany({
          where,
          skip,
          take: limit,
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
              },
            },
            merchantServiceSubscriptions: {
              where: { status: "ACTIVE" },
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
            billingRecords: {
              select: {
                amount: true,
                status: true,
              },
            },
            _count: {
              select: {
                products: true,
                orders: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.merchant.count({ where }),
      ]);

      // Calculate accumulated charges for each merchant
      const merchantsWithCharges = merchants.map(merchant => {
        const totalCharges = merchant.billingRecords.reduce((sum, record) => {
          return sum + Number(record.amount);
        }, 0);
        
        const paidCharges = merchant.billingRecords
          .filter(record => record.status === "PAID")
          .reduce((sum, record) => sum + Number(record.amount), 0);
        
        const pendingCharges = merchant.billingRecords
          .filter(record => record.status === "PENDING")
          .reduce((sum, record) => sum + Number(record.amount), 0);
        
        const overdueCharges = merchant.billingRecords
          .filter(record => record.status === "OVERDUE")
          .reduce((sum, record) => sum + Number(record.amount), 0);

        return {
          ...merchant,
          accumulatedCharges: {
            total: totalCharges,
            paid: paidCharges,
            pending: pendingCharges,
            overdue: overdueCharges,
          },
        };
      });

      return createResponse(
        {
          merchants: merchantsWithCharges,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        200,
        "Merchants retrieved successfully"
      );
    } catch (error) {
      console.error("Get merchants error:", error);
      return createErrorResponse("Failed to retrieve merchants", 500);
    }
  }
);

// POST /api/merchants
export const POST = withRole(
  ["SJFS_ADMIN"],
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const merchantData = createMerchantSchema.parse(body);

      // Check if merchant already exists
      const existingMerchant = await prisma.merchant.findFirst({
        where: {
          OR: [
            { businessEmail: merchantData.businessEmail },
            ...(merchantData.cacNumber
              ? [{ cacNumber: merchantData.cacNumber }]
              : []),
          ],
        },
      });

      if (existingMerchant) {
        return createErrorResponse(
          "Merchant with this email or CAC number already exists",
          400
        );
      }

      // Create merchant
      const newMerchant = await prisma.merchant.create({
        data: merchantData,
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Log the creation
      await prisma.auditLog.create({
        data: {
          user: {
            connect: { id: user.userId }
          },
          action: "CREATE_MERCHANT",
          entityType: "merchants",
          entityId: newMerchant.id,
          newValues: merchantData,
        },
      });

      return createResponse(newMerchant, 201, "Merchant created successfully");
    } catch (error) {
      console.error("Create merchant error:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        return createErrorResponse("Invalid input data", 400);
      }
      return createErrorResponse("Failed to create merchant", 500);
    }
  }
);
