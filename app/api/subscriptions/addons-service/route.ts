import { createErrorResponse, createResponse, withRole } from "@/app/lib/api-utils"
import { JWTPayload } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { NextRequest } from "next/server"

// GET /api/addon-services
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
    try {
      const addonServices = await prisma.addonService.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          pricingType: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      })
  
      return createResponse(addonServices, 200, 'Addon services retrieved successfully')
    } catch (error) {
      console.error('Get addon services error:', error)
      return createErrorResponse('Failed to retrieve addon services', 500)
    }
  })