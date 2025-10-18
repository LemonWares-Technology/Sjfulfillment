import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { hashPassword } from '../../../lib/password'
import { createResponse, createErrorResponse } from '../../../lib/api-utils'
import { z } from 'zod'

// Public registration schema (only allows SJFS_ADMIN for initial setup)
const publicRegisterSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.literal('SJFS_ADMIN') // Only allow SJFS_ADMIN for public registration
})

// POST /api/auth/register-public
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const userData = publicRegisterSchema.parse(body)

    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SJFS_ADMIN' }
    })

    if (existingAdmin) {
      return createErrorResponse('Admin user already exists. Please use the protected registration endpoint.', 400)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          ...(userData.phone ? [{ phone: userData.phone }] : [])
        ]
      }
    })

    if (existingUser) {
      return createErrorResponse('User with this email or phone already exists', 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        isActive: true, // Explicitly set as active for initial admin
        emailVerified: new Date() // Auto-verify for initial admin
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

    return createResponse(newUser, 201, 'Admin user created successfully')
  } catch (error) {
    console.error('Public registration error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Registration failed', 500)
  }
}
