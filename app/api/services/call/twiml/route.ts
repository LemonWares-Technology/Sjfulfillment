import { NextRequest, NextResponse } from 'next/server'

// Deprecated: This route was used for Twilio TwiML. The app now uses Vonage NCCO.
export async function GET(req: NextRequest) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n<Say voice="alice">This endpoint is deprecated. Voice calls now use Vonage NCCO. No action needed.</Say>\n</Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}