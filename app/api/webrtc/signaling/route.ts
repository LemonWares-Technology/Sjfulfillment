import { NextRequest } from 'next/server'
import { createResponse, createErrorResponse, withRole } from '@/app/lib/api-utils'

// Simple in-memory signaling store (in production, use Redis or similar)
const signalingStore = new Map<string, {
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  iceCandidates: RTCIceCandidateInit[]
  createdAt: number
}>()

// Clean up old entries (older than 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of signalingStore.entries()) {
    if (now - value.createdAt > 5 * 60 * 1000) {
      signalingStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

// POST /api/webrtc/signaling - Create or update signaling data
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { roomId, type, data } = body

    if (!roomId || !type) {
      return createErrorResponse('Room ID and type are required', 400)
    }

    const key = `room:${roomId}`
    const existing = signalingStore.get(key) || {
      iceCandidates: [],
      createdAt: Date.now()
    }

    switch (type) {
      case 'offer':
        existing.offer = data
        break
      case 'answer':
        existing.answer = data
        break
      case 'ice-candidate':
        if (data) {
          existing.iceCandidates.push(data)
        }
        break
      default:
        return createErrorResponse('Invalid signaling type', 400)
    }

    signalingStore.set(key, existing)

    return createResponse({ success: true }, 200, 'Signaling data updated')
  } catch (error) {
    console.error('WebRTC signaling error:', error)
    return createErrorResponse('Failed to update signaling data', 500)
  }
})

// GET /api/webrtc/signaling - Get signaling data
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const type = searchParams.get('type')

    if (!roomId) {
      return createErrorResponse('Room ID is required', 400)
    }

    const key = `room:${roomId}`
    const data = signalingStore.get(key)

    if (!data) {
      return createResponse({ data: null }, 200, 'No signaling data found')
    }

    let responseData = null
    switch (type) {
      case 'offer':
        responseData = data.offer
        break
      case 'answer':
        responseData = data.answer
        break
      case 'ice-candidates':
        responseData = data.iceCandidates
        break
      default:
        responseData = data
    }

    return createResponse({ data: responseData }, 200, 'Signaling data retrieved')
  } catch (error) {
    console.error('WebRTC signaling error:', error)
    return createErrorResponse('Failed to retrieve signaling data', 500)
  }
})

// DELETE /api/webrtc/signaling - Clear signaling data
export const DELETE = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return createErrorResponse('Room ID is required', 400)
    }

    const key = `room:${roomId}`
    signalingStore.delete(key)

    return createResponse({ success: true }, 200, 'Signaling data cleared')
  } catch (error) {
    console.error('WebRTC signaling error:', error)
    return createErrorResponse('Failed to clear signaling data', 500)
  }
})
