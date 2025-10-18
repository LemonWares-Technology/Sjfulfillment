import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { ensureDefaultServices, ensureSJServices } from '@/app/lib/services-utils'

// GET /api/services
export async function GET(request: NextRequest) {
  try {
    // Ensure all services exist (both merchant and SJ services)
    await ensureDefaultServices()
    await ensureSJServices()
    
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        features: true,
        isActive: true,
        createdAt: true
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Convert Decimal prices to numbers
    const processedServices = services.map(service => ({
      ...service,
      price: Number(service.price)
    }))

    return createResponse(processedServices, 200, 'Services retrieved successfully')
  } catch (error) {
    console.error('Get services error:', error)
    return createErrorResponse('Failed to retrieve services', 500)
  }
}
