import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to check environment variables (without exposing sensitive data)
export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      // Check if we have at least one JWT secret
      HAS_JWT_SECRET: !!(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
      // Check database URL format
      DATABASE_URL_TYPE: process.env.DATABASE_URL?.includes('postgresql') ? 'postgresql' : 
                         process.env.DATABASE_URL?.includes('mysql') ? 'mysql' : 
                         process.env.DATABASE_URL?.includes('sqlite') ? 'sqlite' : 'unknown'
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}













