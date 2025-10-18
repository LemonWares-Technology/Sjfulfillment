import { NextRequest } from "next/server";

import { JWTPayload } from "@/app/lib/auth";
import {
  createErrorResponse,
  createResponse,
  withRole,
} from "@/app/lib/api-utils";
import { prisma } from "@/app/lib/prisma";
import { updateWarehouseZoneSchema } from "@/app/lib/validations";

// GET /api/warehouses/[id]/zones/[zoneId]
export const GET = withRole(
  ["SJFS_ADMIN", "WAREHOUSE_STAFF"],
  async (
    request: NextRequest,
    user: JWTPayload,
    { params }: { params: Promise<{ id: string; zoneId: string }> }
  ) => {
    try {
      const { id: warehouseId, zoneId } = await params;

      const zone = await prisma.warehouseZone.findFirst({
        where: {
          id: zoneId,
          warehouseId,
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!zone) {
        return createErrorResponse("Warehouse zone not found", 404);
      }

      return createResponse(zone, 200, "Warehouse zone retrieved successfully");
    } catch (error) {
      console.error("Get warehouse zone error:", error);
      return createErrorResponse("Failed to retrieve warehouse zone", 500);
    }
  }
);

// PUT /api/warehouses/[id]/zones/[zoneId]
export const PUT = withRole(
  ["SJFS_ADMIN"],
  async (
    request: NextRequest,
    user: JWTPayload,
    { params }: { params: Promise<{ id: string; zoneId: string }> }
  ) => {
    try {
      const { id: warehouseId, zoneId } = await params;
      const body = await request.json();
      const updateData = updateWarehouseZoneSchema.parse(body);

      // Check if zone exists
      const existingZone = await prisma.warehouseZone.findFirst({
        where: {
          id: zoneId,
          warehouseId,
        },
        select: { id: true, code: true, capacity: true },
      });

      if (!existingZone) {
        return createErrorResponse("Warehouse zone not found", 404);
      }

      // Check if new code conflicts with other zones in the same warehouse
      if (updateData.code && updateData.code !== existingZone.code) {
        const codeExists = await prisma.warehouseZone.findFirst({
          where: {
            warehouseId,
            code: updateData.code,
            id: { not: zoneId },
          },
        });
        if (codeExists) {
          return createErrorResponse(
            "Zone with this code already exists in this warehouse",
            400
          );
        }
      }

      // Check capacity constraints if capacity is being updated
      if (
        updateData.capacity &&
        updateData.capacity !== existingZone.capacity
      ) {
        const warehouse = await prisma.warehouseLocation.findUnique({
          where: { id: warehouseId },
          select: { capacity: true },
        });

        if (warehouse?.capacity) {
          const otherZonesCapacity = await prisma.warehouseZone.aggregate({
            where: {
              warehouseId,
              id: { not: zoneId },
            },
            _sum: { capacity: true },
          });

          const totalCapacity =
            (otherZonesCapacity._sum.capacity || 0) + updateData.capacity;
          if (totalCapacity > warehouse.capacity) {
            return createErrorResponse(
              `Total zone capacity (${totalCapacity}) would exceed warehouse capacity (${warehouse.capacity})`,
              400
            );
          }
        }
      }

      // Update zone
      const updatedZone = await prisma.warehouseZone.update({
        where: { id: zoneId },
        data: updateData,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      // Log the change
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "UPDATE_WAREHOUSE_ZONE",
          entityType: "warehouse_zones",
          entityId: zoneId,
          newValues: updateData,
        },
      });

      return createResponse(
        updatedZone,
        200,
        "Warehouse zone updated successfully"
      );
    } catch (error) {
      console.error("Update warehouse zone error:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        return createErrorResponse("Invalid input data", 400);
      }
      return createErrorResponse("Failed to update warehouse zone", 500);
    }
  }
);

// DELETE /api/warehouses/[id]/zones/[zoneId]
export const DELETE = withRole(
  ["SJFS_ADMIN"],
  async (
    request: NextRequest,
    user: JWTPayload,
    { params }: { params: Promise<{ id: string; zoneId: string }> }
  ) => {
    try {
      const { id: warehouseId, zoneId } = await params;

      // Check if zone exists
      const existingZone = await prisma.warehouseZone.findFirst({
        where: {
          id: zoneId,
          warehouseId,
        },
        select: { id: true, name: true, code: true },
      });

      if (!existingZone) {
        return createErrorResponse("Warehouse zone not found", 404);
      }

      // Check if zone has stock items (since stock items are linked to warehouses, not zones directly)
      // This is a placeholder check - in a real implementation, you might want to track zone assignments differently
      const stockItemsCount = 0; // For now, we'll allow deletion

      if (stockItemsCount > 0) {
        return createErrorResponse(
          "Cannot delete zone with existing stock items. Please move or remove stock items first.",
          400
        );
      }

      // Delete zone
      await prisma.warehouseZone.delete({
        where: { id: zoneId },
      });

      // Log the deletion
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "DELETE_WAREHOUSE_ZONE",
          entityType: "warehouse_zones",
          entityId: zoneId,
        },
      });

      return createResponse(null, 200, "Warehouse zone deleted successfully");
    } catch (error) {
      console.error("Delete warehouse zone error:", error);
      return createErrorResponse("Failed to delete warehouse zone", 500);
    }
  }
);
