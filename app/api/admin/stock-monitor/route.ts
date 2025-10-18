import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { stockMonitor } from '@/app/lib/stock-monitor'

// POST /api/admin/stock-monitor - Run stock monitoring checks
export const POST = withRole(
  ['SJFS_ADMIN'],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      console.log('Stock monitoring triggered by admin:', user.userId)
      
      await stockMonitor.runAllChecks()
      
      return NextResponse.json({
        message: 'Stock monitoring completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error running stock monitoring:', error)
      return createErrorResponse('Failed to run stock monitoring', 500)
    }
  }
)
