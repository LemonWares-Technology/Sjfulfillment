import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { telegramBot } from '@/app/lib/telegram-bot'

// POST /api/telegram/call/initiate - Initiate Telegram contact
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { recipientId, recipientName, recipientRole, type } = body

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        telegramId: true
      }
    })

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    // Get recipient info
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        telegramId: true,
        telegramSubscribed: true
      }
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    if (!recipient.telegramId) {
      return NextResponse.json({ 
        error: 'Recipient does not have Telegram connected',
        success: false 
      }, { status: 400 })
    }

    if (!recipient.telegramSubscribed) {
      return NextResponse.json({ 
        error: 'Recipient has not subscribed to Telegram notifications',
        success: false 
      }, { status: 400 })
    }

    // Get bot service
    const botService = telegramBot
    if (!botService) {
      return NextResponse.json({ 
        error: 'Telegram bot service not available',
        success: false 
      }, { status: 503 })
    }

    // Create contact message
    const senderName = `${sender.firstName} ${sender.lastName || ''}`.trim()
    const message = `
📞 <b>Contact Request from SJ Fulfillment</b>

<b>From:</b> ${senderName}
<b>Role:</b> ${sender.role}
<b>Email:</b> ${sender.email}

<b>Message:</b>
Hello! I'd like to get in touch with you regarding SJ Fulfillment business.

You can respond to this message directly, and I'll receive your reply.

<b>Contact Type:</b> ${type === 'telegram_contact' ? 'Business Contact' : 'General Inquiry'}

---
<i>This message was sent through SJ Fulfillment's Telegram integration.</i>
    `

    // Send message to recipient
    const result = await botService.sendMessageToUser(recipient.telegramId, message)

    // Log the contact initiation
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'TELEGRAM_CONTACT_INITIATED',
        entityType: 'contacts',
        entityId: recipientId,
        newValues: {
          recipientId,
          recipientName: recipientName || `${recipient.firstName} ${recipient.lastName || ''}`.trim(),
          recipientRole: recipientRole || recipient.role,
          contactType: type || 'telegram_contact',
          initiatedAt: new Date()
        }
      }
    })

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'SYSTEM_ALERT',
        message: `You received a Telegram contact request from ${senderName}`,
        link: '/notifications'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram contact initiated successfully',
      result: {
        recipientId,
        recipientName: recipientName || `${recipient.firstName} ${recipient.lastName || ''}`.trim(),
        messageId: result.result?.message_id,
        sentAt: new Date()
      }
    })
  } catch (error: any) {
    console.error('Error initiating Telegram contact:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to initiate Telegram contact',
      success: false 
    }, { status: 500 })
  }
})
