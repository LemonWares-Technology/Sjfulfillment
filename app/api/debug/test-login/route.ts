import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyPassword } from '@/app/lib/password'
import { generateToken } from '@/app/lib/auth'

// Test login endpoint to verify the login process
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('🧪 Test Login - Starting process for:', email)

    // Step 1: Check environment
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    console.log('🧪 JWT Secret available:', !!jwtSecret)
    console.log('🧪 Database URL available:', !!process.env.DATABASE_URL)

    // Step 2: Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            onboardingStatus: true,
          },
        },
      },
    })

    console.log('🧪 User found:', !!user)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        step: 'user_lookup'
      })
    }

    console.log('🧪 User active:', user.isActive)
    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        error: 'User is not active',
        step: 'user_active_check'
      })
    }

    // Step 3: Verify password
    console.log('🧪 Verifying password...')
    const isValidPassword = await verifyPassword(password, user.password)
    console.log('🧪 Password valid:', isValidPassword)

    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: 'Invalid password',
        step: 'password_verification'
      })
    }

    // Step 4: Generate token
    console.log('🧪 Generating token...')
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    })
    console.log('🧪 Token generated:', !!token)

    // Step 5: Return success
    return NextResponse.json({
      success: true,
      message: 'Login test successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        merchantId: user.merchantId
      },
      token: token.substring(0, 50) + '...', // Show first 50 chars for debugging
      step: 'complete'
    })

  } catch (error) {
    console.error('🧪 Test login error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'error'
    }, { status: 500 })
  }
}













