import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUser(req)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const { to } = data
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error ending call:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to end call' },
      { status: 500 }
    )
  }
}