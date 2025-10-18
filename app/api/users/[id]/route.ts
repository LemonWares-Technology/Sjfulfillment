import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateUserSchema } from '../../../lib/validations'
import { hashPassword } from '../../../lib/password'

// GET /api/users/[id]
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: userId } = await params

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
            onboardingStatus: true
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!userData) {
      return createErrorResponse('User not found', 404)
    }

    // Check if merchant admin can access this user
    if (user.role === 'MERCHANT_ADMIN' && userData.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    return createResponse(userData, 200, 'User retrieved successfully')
  } catch (error) {
    console.error('Get user error:', error)
    return createErrorResponse('Failed to retrieve user', 500)
  }
})

// PUT /api/users/[id]
export const PUT = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: userId } = await params
    const body = await request.json()
    const updateData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, merchantId: true, role: true }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }

    // Check permissions
    if (user.role === 'MERCHANT_ADMIN' && existingUser.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Merchant admins cannot change roles or deactivate users
    if (user.role === 'MERCHANT_ADMIN') {
      delete updateData.role
      delete updateData.isActive
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        twoFactorEnabled: true,
        lastLogin: true,
        updatedAt: true
      }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'UPDATE_USER',
        entityType: 'users',
        entityId: userId,
        newValues: updateData
      }
    })

    return createResponse(updatedUser, 200, 'User updated successfully')
  } catch (error) {
    console.error('Update user error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update user', 500)
  }
})

// DELETE /api/users/[id]
export const DELETE = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: userId } = await params

    // Prevent self-deletion
    if (userId === user.userId) {
      return createErrorResponse('You cannot delete your own account', 403)
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!existingUser) {
      return createErrorResponse('User not found', 404)
    }


    // Soft delete by deactivating
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'DELETE_USER',
        entityType: 'users',
        entityId: userId
      }
    })

    return createResponse(null, 200, 'User deactivated successfully')
  } catch (error) {
    console.error('Delete user error:', error)
    return createErrorResponse('Failed to delete user', 500)
  }
})
