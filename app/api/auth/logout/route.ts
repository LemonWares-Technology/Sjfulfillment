import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withAuth } from '../../../lib/api-utils'

// POST /api/auth/logout
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7)

    if (token) {
      // Delete session
      await prisma.userSession.deleteMany({
        where: { token }
      })
    }

    return createResponse(null, 200, 'Logout successful')
  } catch (error) {
    console.error('Logout error:', error)
    return createErrorResponse('Logout failed', 500)
  }
})
