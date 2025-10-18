import { NextRequest } from 'next/server'

import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createUserSchema } from '@/app/lib/validations'
import { hashPassword } from '@/app/lib/password'

// GET /api/users
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const role = searchParams.get('role')
    const merchantId = searchParams.get('merchantId')
    const isActive = searchParams.get('isActive')

    const where: any = {}

    // Filter by merchant if user is merchant admin
    if (user.role === 'MERCHANT_ADMIN') {
      where.merchantId = user.merchantId
    } else if (merchantId) {
      where.merchantId = merchantId
    }

    if (role) where.role = role
    if (isActive !== null) where.isActive = isActive === 'true'

    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          lastLogin: true,
          createdAt: true,
          merchant: {
            select: {
              id: true,
              businessName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    return createResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Users retrieved successfully')
  } catch (error) {
    console.error('Get users error:', error)
    return createErrorResponse('Failed to retrieve users', 500)
  }
})

// POST /api/users
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const userData = createUserSchema.parse(body)

    // If merchant admin, ensure they can only create users for their merchant
    if (user.role === 'MERCHANT_ADMIN') {
      userData.merchantId = user.merchantId
      userData.role = 'MERCHANT_STAFF' // Merchant admins can only create staff
      
      // Check staff limit (maximum 4 staff per merchant)
      const currentStaffCount = await prisma.user.count({
        where: {
          merchantId: user.merchantId,
          role: 'MERCHANT_STAFF',
          isActive: true
        }
      })
      
      if (currentStaffCount >= 4) {
        return createErrorResponse('Maximum staff limit reached. Each merchant can have a maximum of 4 staff members.', 400)
      }
    }

    // Check if user already exists (scoped to merchant for merchant admins)
    const whereClause: any = {
      OR: [
        { email: userData.email },
        ...(userData.phone ? [{ phone: userData.phone }] : [])
      ]
    }

    // For merchant admins, only check within their merchant
    if (user.role === 'MERCHANT_ADMIN') {
      whereClause.merchantId = user.merchantId
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
    console.error('Create user error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create user', 500)
  }
})
