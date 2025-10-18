import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withAuth } from '../../../lib/api-utils'

// GET /api/auth/me
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
            onboardingStatus: true,
            isActive: true
          }
        },
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!userData) {
      return createErrorResponse('User not found', 404)
    }

    return createResponse(userData, 200, 'User profile retrieved')
  } catch (error) {
    console.error('Get profile error:', error)
    return createErrorResponse('Failed to retrieve profile', 500)
  }
})
