import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { telegramBot } from '@/app/lib/telegram-bot'

// POST /api/telegram/auth/connect - Connect user's Telegram account
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID is required' }, { status: 400 })
    }

    // Check if Telegram ID is already connected to another account
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: telegramId }
    })

    if (existingUser && existingUser.id !== user.userId) {
      return NextResponse.json({ 
        error: 'This Telegram account is already connected to another user',
        success: false 
      }, { status: 409 })
    }

    // Update user's Telegram connection
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        telegramId: telegramId,
        telegramSubscribed: true,
        telegramLastActive: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telegramId: true,
        telegramSubscribed: true
      }
    })

    // Send welcome message to Telegram
    try {
      await telegramBot.sendMessageToUser(telegramId, `
✅ <b>Account Connected Successfully!</b>

Welcome to SJ Fulfillment, ${updatedUser.firstName}!

<b>Your Account:</b>
• Name: ${updatedUser.firstName} ${updatedUser.lastName || ''}
• Email: ${updatedUser.email}
• Role: ${user.role}

<b>You'll now receive:</b>
• Order notifications
• Inventory alerts
• System updates
• Support messages

Use /help to see all available commands.
      `)
    } catch (telegramError) {
      console.warn('Failed to send welcome message to Telegram:', telegramError)
      // Don't fail the connection if message sending fails
    }

    // Log the connection
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'TELEGRAM_CONNECT',
        entityType: 'users',
        entityId: user.userId,
        newValues: {
          telegramId: telegramId,
          connectedAt: new Date()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram account connected successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error connecting Telegram account:', error)
    return NextResponse.json({ 
      error: 'Failed to connect Telegram account',
      success: false 
    }, { status: 500 })
  }
})

// DELETE /api/telegram/auth/connect - Disconnect user's Telegram account
export const DELETE = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { telegramId: true }
    })

    if (!userData?.telegramId) {
      return NextResponse.json({ 
        error: 'No Telegram account connected',
        success: false 
      }, { status: 404 })
    }

    // Send goodbye message to Telegram
    try {
      await telegramBot.sendMessageToUser(userData.telegramId, `
👋 <b>Account Disconnected</b>

Your Telegram account has been unlinked from SJ Fulfillment.

You can reconnect anytime from your dashboard settings.
      `)
    } catch (telegramError) {
      console.warn('Failed to send goodbye message to Telegram:', telegramError)
      // Don't fail the disconnection if message sending fails
    }

    // Disconnect the account
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        telegramId: null,
        telegramSubscribed: false,
        telegramLastActive: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    // Log the disconnection
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'TELEGRAM_DISCONNECT',
        entityType: 'users',
        entityId: user.userId,
        oldValues: {
          telegramId: userData.telegramId,
          disconnectedAt: new Date()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram account disconnected successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error disconnecting Telegram account:', error)
    return NextResponse.json({ 
      error: 'Failed to disconnect Telegram account',
      success: false 
    }, { status: 500 })
  }
})
