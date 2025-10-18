import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/app/lib/api-utils'
import { telegramBot } from '@/app/lib/telegram-bot'

// GET /api/telegram/test - Test Telegram bot functionality
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    // Test bot info
    const botInfo = await telegramBot.getBotInfo()
    
    if (!botInfo) {
      return NextResponse.json({
        success: false,
        error: 'Telegram bot not configured or not responding',
        configured: !!process.env.TELEGRAM_BOT_TOKEN
      }, { status: 503 })
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram bot is working correctly',
      botInfo: botInfo.result,
      configured: true,
      user: {
        id: user.userId,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('Telegram test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test Telegram bot',
      configured: !!process.env.TELEGRAM_BOT_TOKEN
    }, { status: 500 })
  }
})

// POST /api/telegram/test - Send test message
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { chatId, message } = body

    if (!chatId || !message) {
      return NextResponse.json({
        success: false,
        error: 'chatId and message are required'
      }, { status: 400 })
    }

    // Send test message
    const result = await telegramBot.sendMessageToUser(chatId, message)

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
      result: result.result,
      sentAt: new Date()
    })
  } catch (error: any) {
    console.error('Telegram test message error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test message'
    }, { status: 500 })
  }
})
