import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { ensureDefaultServices, ensureSJServices, ensureMerchantDefaultSubscription } from '@/app/lib/services-utils'
import { ensureDefaultWarehouse } from '@/app/lib/warehouse-utils'

// POST /api/admin/initialize - Initialize system with default data
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    console.log('Starting system initialization...')
    
    const results = {
      services: 0,
      sjServices: 0,
      warehouses: 0,
      message: 'System initialized successfully'
    }

    // Ensure all services exist
    const merchantServices = await ensureDefaultServices()
    results.services = merchantServices.length

    const sjServices = await ensureSJServices()
    results.sjServices = sjServices.length

    // Ensure default warehouse exists
    const warehouse = await ensureDefaultWarehouse()
    results.warehouses = 1

    console.log('System initialization completed:', results)
    
    return createResponse(results, 200, 'System initialized successfully')
  } catch (error) {
    console.error('System initialization error:', error)
    return createErrorResponse('Failed to initialize system', 500)
  }
})

// GET /api/admin/initialize - Check system status
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/app/lib/prisma')
    
    const [services, sjServices, warehouses] = await Promise.all([
      prisma.service.count({ where: { isActive: true, category: { in: ['Core Services', 'Logistics', 'Customer Service', 'Analytics', 'Administration', 'Integration'] } } }),
      prisma.service.count({ where: { isActive: true, category: { in: ['Setup', 'Operations', 'Storage', 'Communication', 'Delivery', 'Returns', 'Payment', 'Management', 'Logistics'] } } }),
      prisma.warehouseLocation.count({ where: { isActive: true } })
    ])

    const status = {
      initialized: services > 0 && sjServices > 0 && warehouses > 0,
      services: services,
      sjServices: sjServices,
      warehouses: warehouses,
      message: services > 0 && sjServices > 0 && warehouses > 0 
        ? 'System is properly initialized' 
        : 'System needs initialization'
    }

    return createResponse(status, 200, 'System status retrieved')
  } catch (error) {
    console.error('System status check error:', error)
    return createErrorResponse('Failed to check system status', 500)
  }
})

