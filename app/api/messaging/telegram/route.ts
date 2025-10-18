import { NextRequest, NextResponse } from 'next/server'
import { telegramBot } from '@/app/lib/telegram-bot'

// Telegram Bot Webhook Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle Telegram webhook updates
    if (body.update_id) {
      await telegramBot.handleWebhookUpdate(body)
      return NextResponse.json({ ok: true })
    }
    
    // Handle manual API calls
    const { action, chatId, message, role } = body
    
    switch (action) {
      case 'send_message':
        if (!chatId || !message) {
          return NextResponse.json({ error: 'chatId and message are required' }, { status: 400 })
        }
        const result = await telegramBot.sendMessageToUser(chatId, message)
        return NextResponse.json({ success: true, result })
        
      case 'broadcast_to_role':
        if (!role || !message) {
          return NextResponse.json({ error: 'role and message are required' }, { status: 400 })
        }
        const broadcastResult = await telegramBot.broadcastToRole(role, message)
        return NextResponse.json({ success: true, results: broadcastResult })
        
      case 'get_bot_info':
        const botInfo = await telegramBot.getBotInfo()
        return NextResponse.json({ success: true, botInfo })
        
      case 'setup_webhook':
        const webhookUrl = body.webhookUrl
        if (!webhookUrl) {
          return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 })
        }
        const webhookResult = await telegramBot.setupWebhook(webhookUrl)
        return NextResponse.json({ success: true, result: webhookResult })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Telegram API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false 
    }, { status: 500 })
  }
}

// GET method for webhook verification and info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'info') {
      const botInfo = await telegramBot.getBotInfo()
      return NextResponse.json({
        success: true,
        botInfo,
        configured: !!process.env.TELEGRAM_BOT_TOKEN
      })
    }
    
    return NextResponse.json({
      message: 'Telegram Bot API',
      status: 'active',
      configured: !!process.env.TELEGRAM_BOT_TOKEN,
      endpoints: {
        webhook: 'POST /api/messaging/telegram',
        send_message: 'POST /api/messaging/telegram (action: send_message)',
        broadcast: 'POST /api/messaging/telegram (action: broadcast_to_role)',
        info: 'GET /api/messaging/telegram?action=info'
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 })
  }
}


