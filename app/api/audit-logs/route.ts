import { NextRequest } from "next/server";

import { JWTPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  createErrorResponse,
  createResponse,
  withRole,
} from "@/app/lib/api-utils";

// GET /api/audit-logs
export const GET = withRole(
  ["SJFS_ADMIN"],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const userId = searchParams.get("userId");
      const entityType = searchParams.get("entityType");
      const action = searchParams.get("action");
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");

      const where: any = {};

      if (userId) where.userId = userId;
      if (entityType) where.entityType = entityType;
      if (action) where.action = action;

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return createResponse(
        {
          auditLogs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        200,
        "Audit logs retrieved successfully"
      );
    } catch (error) {
      console.error("Get audit logs error:", error);
      return createErrorResponse("Failed to retrieve audit logs", 500);
    }
  }
);
