import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const updateOnboardingStatusSchema = z.object({
  merchantId: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().optional()
})

// PUT /api/merchants/[id]/onboarding-status
export const PUT = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: merchantId } = await params
    const body = await request.json()
    const updateData = updateOnboardingStatusSchema.parse(body)

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { 
        id: true, 
        businessName: true, 
        businessEmail: true,
        onboardingStatus: true 
      }
    })

    if (!merchant) {
      return createErrorResponse('Merchant not found', 404)
    }

    // Update merchant onboarding status
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: { 
        onboardingStatus: updateData.status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        businessName: true,
        businessEmail: true,
        onboardingStatus: true,
        updatedAt: true
      }
    })

    // Log the status change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'UPDATE_MERCHANT_ONBOARDING_STATUS',
        entityType: 'merchants',
        entityId: merchantId,
        oldValues: { onboardingStatus: merchant.onboardingStatus },
        newValues: { 
          onboardingStatus: updateData.status,
          reason: updateData.reason 
        }
      }
    })

    // If approved, create a notification for the merchant
    if (updateData.status === 'APPROVED') {
      const merchantUsers = await prisma.user.findMany({
        where: { merchantId },
        select: { id: true }
      })

      if (merchantUsers.length > 0) {
        await prisma.notification.createMany({
          data: merchantUsers.map(user => ({
            userId: user.id,
            title: 'Merchant Account Approved',
            message: `Your merchant account "${merchant.businessName}" has been approved. You can now select and pay for services.`,
            type: 'SUCCESS',
            isRead: false
          }))
        })
      }
    }

    return createResponse(updatedMerchant, 200, `Merchant onboarding status updated to ${updateData.status}`)
  } catch (error) {
    console.error('Update merchant onboarding status error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update merchant onboarding status', 500)
  }
})

// GET /api/merchants/pending-approval
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'PENDING'

    const skip = (page - 1) * limit

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where: { onboardingStatus: status },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              products: true,
              subscriptions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.merchant.count({ where: { onboardingStatus: status } })
    ])

    return createResponse({
      merchants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Merchants retrieved successfully')
  } catch (error) {
    console.error('Get pending merchants error:', error)
    return createErrorResponse('Failed to retrieve merchants', 500)
  }
})
