import { NextRequest } from "next/server";

import { JWTPayload } from "@/app/lib/auth";
import {
  createErrorResponse,
  createResponse,
  withRole,
} from "@/app/lib/api-utils";
import { prisma } from "@/app/lib/prisma";
import { createWarehouseSchema } from "@/app/lib/validations";
import SKUGenerator from "@/app/lib/sku-generator";

// GET /api/warehouses
export const GET = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN", "MERCHANT_STAFF", "WAREHOUSE_STAFF"],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const city = searchParams.get("city");
      const state = searchParams.get("state");
      const isActive = searchParams.get("isActive");

      const where: any = {};
      if (city) where.city = city;
      if (state) where.state = state;
      if (isActive !== null) where.isActive = isActive === "true";

      // Merchants can see all warehouses created by admin
      // Only filter if specifically requested

      const skip = (page - 1) * limit;

      console.log('Warehouse query where clause:', where)
      const [warehouses, total] = await Promise.all([
        prisma.warehouseLocation.findMany({
          where,
          skip,
          take: limit,
          include: {
            merchants: {
              select: {
                id: true,
                businessName: true,
                businessEmail: true,
              },
            },
            zones: {
              select: {
                id: true,
                name: true,
                code: true,
                capacity: true,
                isActive: true,
              },
            },
            stockItems: {
              select: {
                id: true,
                quantity: true,
                availableQuantity: true,
                reservedQuantity: true,
              },
            },
            orders: {
              where: {
                status: {
                  in: ["PENDING", "PROCESSING", "PICKED", "PACKED", "SHIPPED"],
                },
              },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
              },
            },
            _count: {
              select: {
                stockItems: true,
                orders: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.warehouseLocation.count({ where }),
      ]);

      console.log('Found warehouses:', warehouses.length, 'Total:', total)

      return createResponse(
        {
          warehouses,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        200,
        "Warehouses retrieved successfully"
      );
    } catch (error) {
      console.error("Get warehouses error:", error);
      return createErrorResponse("Failed to retrieve warehouses", 500);
    }
  }
);

// POST /api/warehouses
export const POST = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN"],
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      
      // Generate auto warehouse code if not provided
      let code = body.code
      if (!code) {
        code = await SKUGenerator.generateWarehouseCode(body.city, body.state)
      }

      // Prepare warehouse data with auto-generated code
      const warehouseData = {
        ...body,
        code
      }

      // Validate the data
      const validatedData = createWarehouseSchema.parse(warehouseData)

      // Check if warehouse code already exists
      const existingWarehouse = await prisma.warehouseLocation.findUnique({
        where: { code: validatedData.code },
      });

      if (existingWarehouse) {
        return createErrorResponse(
          "Warehouse with this code already exists",
          400
        );
      }

      // Create warehouse
      const newWarehouse = await prisma.warehouseLocation.create({
        data: {
          ...validatedData,
          // If merchant admin creates warehouse, associate it with their merchant
          ...(user.role === 'MERCHANT_ADMIN' && {
            merchants: {
              connect: { id: user.merchantId }
            }
          })
        },
        include: {
          merchants: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });

      // Log the creation
      await prisma.auditLog.create({
        data: {
          user: { connect: { id: user.userId } },
          action: "CREATE_WAREHOUSE",
          entityType: "warehouse_locations",
          entityId: newWarehouse.id,
          newValues: validatedData,
        },
      });

      return createResponse(
        newWarehouse,
        201,
        "Warehouse created successfully"
      );
    } catch (error) {
      console.error("Create warehouse error:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        return createErrorResponse("Invalid input data", 400);
      }
      return createErrorResponse("Failed to create warehouse", 500);
    }
  }
);
