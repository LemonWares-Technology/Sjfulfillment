import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'

// DELETE /api/admin/clear-services
export const DELETE = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    console.log('Clearing all services...')

    // Get count before deletion
    const serviceCount = await prisma.service.count()
    
    if (serviceCount === 0) {
      return createResponse({
        message: 'No services to clear',
        count: 0
      }, 200, 'No services found')
    }

    // Delete all services (this will also cascade delete related subscriptions)
    const deleteResult = await prisma.service.deleteMany({})

    console.log(`✅ Deleted ${deleteResult.count} services successfully!`)

    return createResponse({
      message: `Successfully deleted ${deleteResult.count} services`,
      deletedCount: deleteResult.count
    }, 200, 'Services cleared successfully')

  } catch (error) {
    console.error('❌ Error clearing services:', error)
    return createErrorResponse('Failed to clear services', 500)
  }
})

// GET /api/admin/clear-services - Check current services
export const GET = withRole(['SJFS_ADMIN'], async () => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return createResponse({
      services,
      count: services.length,
      message: `Found ${services.length} services`
    }, 200, 'Services retrieved')

  } catch (error) {
    console.error('Error checking services:', error)
    return createErrorResponse('Failed to check services', 500)
  }
})



