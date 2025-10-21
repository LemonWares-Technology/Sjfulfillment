import { NextRequest, NextResponse } from 'next/server'
import {prisma} from '@/app/lib/prisma'
import { CallStatus } from '@/app/generated/prisma'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // Vonage sends JSON webhooks
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const callUuid = body.uuid || body.call_uuid || body.conversation_uuid
      const statusRaw = (body.status || body.call_status || '').toString().toLowerCase()

      const map: Record<string, CallStatus> = {
        started: 'IN_PROGRESS',
        ringing: 'RINGING',
        answered: 'IN_PROGRESS',
        completed: 'COMPLETED',
        failed: 'FAILED',
        busy: 'BUSY',
        timeout: 'NO_ANSWER',
        cancelled: 'CANCELLED',
      }
      const mapped = map[statusRaw] || 'INITIATED'

      if (callUuid) {
        await prisma.callLog.update({
          where: { callSid: String(callUuid) },
          data: { status: mapped },
        })
      }
      return new NextResponse('OK')
    }

    // Back-compat for Twilio form payloads
    const formData = await req.formData()
    const callSid = formData.get('CallSid')
    const callStatus = formData.get('CallStatus')
    if (callSid && callStatus) {
      await prisma.callLog.update({
        where: { callSid: callSid.toString() },
        data: { status: callStatus.toString() as CallStatus },
      })
    }
    return new NextResponse('OK')
  } catch (error) {
    console.error('Error updating call status:', error)
    return new NextResponse('Error', { status: 500 })
  }
}