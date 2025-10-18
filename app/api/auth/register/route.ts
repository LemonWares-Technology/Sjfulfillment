import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { hashPassword } from '../../../lib/password'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { createUserSchema } from '../../../lib/validations'

// POST /api/auth/register
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const userData = createUserSchema.parse(body)

    // Check if user already exists (scoped to merchant for merchant admins)
    const whereClause: any = {
      OR: [
        { email: userData.email },
        ...(userData.phone ? [{ phone: userData.phone }] : [])
      ]
    }

    // For merchant admins, only check within their merchant
    if (user.role === 'MERCHANT_ADMIN' && userData.merchantId) {
      whereClause.merchantId = userData.merchantId
    }

    const existingUser = await prisma.user.findFirst({
      where: whereClause
    })

    if (existingUser) {
      const scope = user.role === 'MERCHANT_ADMIN' ? 'in your merchant' : 'globally'
      return createErrorResponse(`User with this email or phone already exists ${scope}`, 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        isActive: true, // Explicitly set as active for admin-created users
        emailVerified: new Date() // Auto-verify for admin-created users
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        merchantId: true,
        createdAt: true
      }
    })

    return createResponse(newUser, 201, 'User created successfully')
  } catch (error) {
    console.error('Registration error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Registration failed', 500)
  }
})
