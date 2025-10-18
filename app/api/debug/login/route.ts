import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

// Debug endpoint to troubleshoot login issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('🔍 Debug Login - Email:', email)
    console.log('🔍 Debug Login - Password provided:', !!password)

    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV
    }
    console.log('🔍 Environment check:', envCheck)

    // Test database connection
    let dbConnection = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbConnection = true
      console.log('✅ Database connection successful')
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError)
    }

    // Try to find user
    let user = null
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          password: true
        }
      })
      console.log('🔍 User found:', !!user)
      if (user) {
        console.log('🔍 User active:', user.isActive)
        console.log('🔍 User role:', user.role)
      }
    } catch (userError) {
      console.error('❌ User lookup failed:', userError)
    }

    // Test password verification
    let passwordValid = false
    if (user && password) {
      try {
        const bcrypt = require('bcryptjs')
        passwordValid = await bcrypt.compare(password, user.password)
        console.log('🔍 Password valid:', passwordValid)
      } catch (pwdError) {
        console.error('❌ Password verification failed:', pwdError)
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        email,
        passwordProvided: !!password,
        environment: envCheck,
        databaseConnection: dbConnection,
        userFound: !!user,
        userActive: user?.isActive,
        userRole: user?.role,
        passwordValid,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Debug login error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

