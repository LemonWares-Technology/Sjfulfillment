// instrumentation.ts - Custom logging configuration
// This file is automatically loaded by Next.js

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress verbose Next.js request logs in development
    const originalLog = console.log
    console.log = function(...args: any[]) {
      // Filter out repetitive GET request logs for specific endpoints
      const message = args.join(' ')
      
      // Skip logging for these patterns
      if (
        message.includes('GET /api/merchant-services/status 200') ||
        message.includes('GET /api/notifications?limit=10&unreadOnly=false 200')
      ) {
        return // Skip these logs
      }
      
      // Log everything else normally
      originalLog.apply(console, args)
    }
  }
}
