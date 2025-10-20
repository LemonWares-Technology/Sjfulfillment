import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createMerchantSchema } from '@/app/lib/validations'
import { hashPassword } from '@/app/lib/password'
import { sendWelcomeMerchantEmail } from '@/app/lib/email'

// POST /api/merchants/register-public
// Public endpoint for merchants to register themselves
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse merchant data
    const merchantData = createMerchantSchema.parse(body.merchant)
    
    // Parse user data
    const userData = {
      firstName: body.user.firstName,
      lastName: body.user.lastName,
      email: body.user.email,
      phone: body.user.phone,
      password: body.user.password,
      role: 'MERCHANT_ADMIN' as const
    }

    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
      return createErrorResponse('All user fields are required', 400)
    }

    // Check if merchant already exists
    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { businessEmail: merchantData.businessEmail },
          ...(merchantData.cacNumber ? [{ cacNumber: merchantData.cacNumber }] : [])
        ]
      }
    })

    if (existingMerchant) {
      return createErrorResponse('Merchant with this email or CAC number already exists', 400)
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

    // Create merchant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create merchant
      const newMerchant = await tx.merchant.create({
        data: {
          ...merchantData,
          onboardingStatus: 'APPROVED' // Auto-approve for payment-first flow
        }
      })

      // Create user
      const newUser = await tx.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          merchantId: newMerchant.id,
          emailVerified: new Date() // Auto-verify for self-registration
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          merchantId: true,
          createdAt: true
        }
      })

      return { merchant: newMerchant, user: newUser }
    }, {
      timeout: 10000 // Increase timeout to 10 seconds
    })

    // Log the registration
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: result.user.id } },
        action: 'MERCHANT_SELF_REGISTRATION',
        entityType: 'merchants',
        entityId: result.merchant.id,
        newValues: {
          merchant: merchantData,
          user: { ...userData, password: '[HIDDEN]' }
        }
      }
    })

    // Send welcome email with login credentials
    sendWelcomeMerchantEmail({
      to: result.user.email,
      businessName: result.merchant.businessName,
      firstName: result.user.firstName || undefined,
      email: result.user.email,
      password: userData.password // Original unhashed password
    }).catch(err => {
      console.error('Failed to send welcome email to merchant:', err)
    })

    return createResponse({
      merchant: result.merchant,
      user: result.user,
      message: 'Registration successful. Please select a service plan and complete payment to access the platform.'
    }, 201, 'Merchant registered successfully')
  } catch (error) {
    console.error('Merchant registration error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Registration failed', 500)
  }
}
