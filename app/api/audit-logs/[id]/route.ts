import { createErrorResponse, createResponse, withRole } from "@/app/lib/api-utils"
import { JWTPayload } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { NextRequest } from "next/server"

// GET /api/audit-logs/[id]
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: auditLogId } = await params
  
      const auditLog = await prisma.auditLog.findUnique({
        where: { id: auditLogId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              merchant: {
                select: {
                  id: true,
                  businessName: true
                }
              }
            }
          }
        }
      })
  
      if (!auditLog) {
        return createErrorResponse('Audit log not found', 404)
      }
  
      return createResponse(auditLog, 200, 'Audit log retrieved successfully')
    } catch (error) {
      console.error('Get audit log error:', error)
      return createErrorResponse('Failed to retrieve audit log', 500)
    }
  })