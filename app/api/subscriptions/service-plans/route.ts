import { createErrorResponse, createResponse, withRole } from "@/app/lib/api-utils"
import { JWTPayload } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { NextRequest } from "next/server"


// GET /api/service-plans
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
    try {
      const servicePlans = await prisma.servicePlan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          features: true,
          createdAt: true
        },
        orderBy: { basePrice: 'asc' }
      })
  
      return createResponse(servicePlans, 200, 'Service plans retrieved successfully')
    } catch (error) {
      console.error('Get service plans error:', error)
      return createErrorResponse('Failed to retrieve service plans', 500)
    }
  })
  