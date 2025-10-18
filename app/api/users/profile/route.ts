import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withAuth } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number too long').optional()
})

// PUT /api/users/profile - Update current user's profile
export const PUT = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const updateData = updateProfileSchema.parse(body)

    // Check if email is being changed and if it's already taken
    if (updateData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.email },
        select: { id: true }
      })

      if (existingUser && existingUser.id !== user.userId) {
        return createErrorResponse('Email is already taken', 400)
      }
    }

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        merchantId: true,
        twoFactorEnabled: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    return createResponse(updatedUser, 200, 'Profile updated successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Update profile error:', error)
    return createErrorResponse('Failed to update profile', 500)
  }
})
