import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// GET /api/telegram/auth/status - Check Telegram connection status
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telegramId: true,
        telegramSubscribed: true,
        telegramLastActive: true
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      connected: !!userData.telegramId,
      telegramId: userData.telegramId,
      subscribed: userData.telegramSubscribed || false,
      lastActive: userData.telegramLastActive,
      user: {
        id: userData.id,
        name: `${userData.firstName} ${userData.lastName || ''}`.trim(),
        email: userData.email
      }
    })
  } catch (error) {
    console.error('Error checking Telegram status:', error)
    return NextResponse.json({ 
      error: 'Failed to check Telegram status',
      success: false 
    }, { status: 500 })
  }
})
