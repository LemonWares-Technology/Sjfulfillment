import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse } from '../../../lib/api-utils'
import { randomBytes } from 'crypto'

// POST /api/auth/forgot-password
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return createErrorResponse('Email is required', 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return createResponse(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        200,
        'Password reset request processed'
      )
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt
      }
    })

    // TODO: Send email with reset link
    // For now, we'll just log the token (in production, send email)
    console.log(`Password reset token for ${user.email}: ${resetToken}`)
    console.log(`Reset link: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`)

    return createResponse(
      { 
        message: 'If an account with that email exists, a password reset link has been sent.',
        // In development, include the reset link for testing
        ...(process.env.NODE_ENV === 'development' && {
          resetLink: `/reset-password?token=${resetToken}`
        })
      },
      200,
      'Password reset request processed'
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return createErrorResponse('Failed to process password reset request', 500)
  }
}
