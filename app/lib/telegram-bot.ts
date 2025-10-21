import { UserRole } from '../generated/prisma'
import { prisma } from './prisma'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  text?: string
  date: number
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

class TelegramBotService {
  private botToken: string | null
  private apiUrl: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`
    
    if (!this.botToken) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not found. Telegram integration will be disabled.')
    }
  }

  async sendMessage(chatId: number, text: string, options?: {
    parse_mode?: 'HTML' | 'Markdown'
    reply_markup?: any
  }) {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured')
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Telegram API error: ${response.status} ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to send Telegram message:', error)
      throw error
    }
  }

  async sendMessageToUser(telegramId: number, message: string) {
    try {
      return await this.sendMessage(telegramId, message, {
        parse_mode: 'HTML'
      })
    } catch (error) {
      console.error('Failed to send message to Telegram user:', error)
      throw error
    }
  }

  async broadcastToRole(role: string, message: string) {
    if (!this.botToken) {
      console.warn('Telegram bot not configured, skipping broadcast')
      return
    }

    try {
      // Find all users with the specified role who have Telegram connected
      const users = await prisma.user.findMany({
        where: {
          role: role as UserRole,
          telegramId: { not: null },
          isActive: true
        },
        select: {
          telegramId: true,
          firstName: true,
          lastName: true
        }
      })

      const results = []
      for (const user of users) {
        if (user.telegramId) {
          try {
            const result = await this.sendMessageToUser(user.telegramId, message)
            results.push({ userId: user.telegramId, success: true, result })
          } catch (error) {
            console.error(`Failed to send to user ${user.telegramId}:`, error)
            results.push({ userId: user.telegramId, success: false, error })
          }
        }
      }

      return results
    } catch (error) {
      console.error('Failed to broadcast to role:', error)
      throw error
    }
  }

  async setupWebhook(webhookUrl: string) {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured')
    }

    try {
      const response = await fetch(`${this.apiUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to set webhook: ${response.status} ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to setup Telegram webhook:', error)
      throw error
    }
  }

  async getBotInfo() {
    if (!this.botToken) {
      return null
    }

    try {
      const response = await fetch(`${this.apiUrl}/getMe`)
      if (!response.ok) {
        throw new Error(`Failed to get bot info: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to get bot info:', error)
      return null
    }
  }

  async handleWebhookUpdate(update: TelegramUpdate) {
    try {
      if (update.message) {
        await this.handleMessage(update.message)
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query)
      }
    } catch (error) {
      console.error('Error handling Telegram webhook update:', error)
    }
  }

  private async handleMessage(message: TelegramMessage) {
    const { from, text, chat } = message

    if (!text) return

    // Handle /start command
    if (text.startsWith('/start')) {
      const connectCode = text.split(' ')[1] // Get connection code from /start <code>
      
      if (connectCode) {
        await this.handleConnectCommand(from, connectCode)
      } else {
        await this.sendMessage(chat.id, `
🤖 <b>Welcome to SJ Fulfillment Bot!</b>

To connect your Telegram account to SJ Fulfillment:

1. Go to your SJ Fulfillment dashboard
2. Navigate to Settings → Telegram
3. Click "Connect Telegram Account"
4. Use the provided code with /start command

Example: <code>/start YOUR_CODE_HERE</code>
        `, { parse_mode: 'HTML' })
      }
      return
    }

    // Handle /help command
    if (text === '/help') {
      await this.sendMessage(chat.id, `
🤖 <b>SJ Fulfillment Bot Commands:</b>

/start - Connect your account
/help - Show this help message
/status - Check your connection status
/unlink - Disconnect your account

<b>Features:</b>
• Real-time order notifications
• Inventory alerts
• System updates
• Direct communication with support
      `, { parse_mode: 'HTML' })
      return
    }

    // Handle /status command
    if (text === '/status') {
      const user = await prisma.user.findUnique({
        where: { telegramId: from.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true
        }
      })

      if (user) {
        await this.sendMessage(chat.id, `
✅ <b>Account Connected!</b>

<b>Name:</b> ${user.firstName} ${user.lastName || ''}
<b>Email:</b> ${user.email}
<b>Role:</b> ${user.role}
<b>Status:</b> ${user.isActive ? 'Active' : 'Inactive'}

You'll receive notifications for:
• Order updates
• Inventory alerts
• System announcements
        `, { parse_mode: 'HTML' })
      } else {
        await this.sendMessage(chat.id, `
❌ <b>Account Not Connected</b>

Your Telegram account is not linked to SJ Fulfillment.

Use /start with your connection code to link your account.
        `, { parse_mode: 'HTML' })
      }
      return
    }

    // Handle /unlink command
    if (text === '/unlink') {
      const user = await prisma.user.findUnique({
        where: { telegramId: from.id }
      })

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramId: null,
            telegramSubscribed: false,
            telegramLastActive: null
          }
        })

        await this.sendMessage(chat.id, `
✅ <b>Account Disconnected</b>

Your Telegram account has been unlinked from SJ Fulfillment.

You can reconnect anytime using /start with a new connection code.
        `, { parse_mode: 'HTML' })
      } else {
        await this.sendMessage(chat.id, `
❌ <b>No Account Found</b>

Your Telegram account is not linked to SJ Fulfillment.
        `, { parse_mode: 'HTML' })
      }
      return
    }

    // Handle other messages (forward to support if connected)
    const user = await prisma.user.findUnique({
      where: { telegramId: from.id }
    })

    if (user) {
      // Log the message for support
      await prisma.auditLog.create({
        data: {
          user: { connect: { id: user.id } },
          action: 'TELEGRAM_MESSAGE',
          entityType: 'messages',
          entityId: message.message_id.toString(),
          newValues: {
            message: text,
            telegramId: from.id,
            timestamp: new Date(message.date * 1000)
          }
        }
      })

      await this.sendMessage(chat.id, `
📝 <b>Message Received</b>

Your message has been logged and will be reviewed by our support team.

For urgent issues, please contact support directly through the dashboard.
      `, { parse_mode: 'HTML' })
    }
  }

  private async handleCallbackQuery(callbackQuery: any) {
    // Handle inline keyboard callbacks if needed
    console.log('Callback query received:', callbackQuery)
  }

  private async handleConnectCommand(from: TelegramUser, connectCode: string) {
    try {
      // Find user by connection code (you'll need to implement this)
      const user = await prisma.user.findFirst({
        where: {
          // You'll need to add a telegramConnectCode field to User model
          // For now, we'll use a simple approach
          email: { contains: connectCode } // Temporary - replace with proper code system
        }
      })

      if (!user) {
        await this.sendMessage(from.id, `
❌ <b>Invalid Connection Code</b>

The connection code "${connectCode}" is not valid or has expired.

Please generate a new code from your SJ Fulfillment dashboard.
        `, { parse_mode: 'HTML' })
        return
      }

      // Check if Telegram ID is already connected to another account
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: from.id }
      })

      if (existingUser && existingUser.id !== user.id) {
        await this.sendMessage(from.id, `
❌ <b>Account Already Connected</b>

This Telegram account is already linked to another SJ Fulfillment account.

Please use a different Telegram account or contact support.
        `, { parse_mode: 'HTML' })
        return
      }

      // Connect the account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId: from.id,
          telegramSubscribed: true,
          telegramLastActive: new Date()
        }
      })

      await this.sendMessage(from.id, `
✅ <b>Account Connected Successfully!</b>

Welcome to SJ Fulfillment, ${user.firstName}!

<b>Your Account:</b>
• Name: ${user.firstName} ${user.lastName || ''}
• Email: ${user.email}
• Role: ${user.role}

<b>You'll now receive:</b>
• Order notifications
• Inventory alerts
• System updates
• Support messages

Use /help to see all available commands.
      `, { parse_mode: 'HTML' })

      // Log the connection
      await prisma.auditLog.create({
        data: {
          user: { connect: { id: user.id } },
          action: 'TELEGRAM_CONNECT',
          entityType: 'users',
          entityId: user.id,
          newValues: {
            telegramId: from.id,
            telegramUsername: from.username,
            connectedAt: new Date()
          }
        }
      })

    } catch (error) {
      console.error('Error handling connect command:', error)
      await this.sendMessage(from.id, `
❌ <b>Connection Failed</b>

An error occurred while connecting your account. Please try again or contact support.
      `, { parse_mode: 'HTML' })
    }
  }
}

// Export singleton instance
export const telegramBot = new TelegramBotService()

// Helper function to get the bot service
export function getTelegramBotService(): TelegramBotService | null {
  return telegramBot.botToken ? telegramBot : null
}
