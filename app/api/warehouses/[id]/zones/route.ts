import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createWarehouseZoneSchema } from '@/app/lib/validations'
import SKUGenerator from '@/app/lib/sku-generator'

// GET /api/warehouses/[id]/zones
export const GET = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    const zones = await prisma.warehouseZone.findMany({
      where: { warehouseId },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createResponse(zones, 200, 'Warehouse zones retrieved successfully')
  } catch (error) {
    console.error('Get warehouse zones error:', error)
    return createErrorResponse('Failed to retrieve warehouse zones', 500)
  }
})

// POST /api/warehouses/[id]/zones
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params
    const body = await request.json()
    
    // Generate auto zone code if not provided
    let code = body.code
    if (!code) {
      code = await SKUGenerator.generateZoneCode(warehouseId, 'STORAGE')
    }

    // Prepare zone data with auto-generated code
    const zoneData = {
      ...body,
      code
    }

    // Validate the data
    const validatedData = createWarehouseZoneSchema.parse(zoneData)

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, capacity: true }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Check if zone code already exists in this warehouse
    const existingZone = await prisma.warehouseZone.findFirst({
      where: { 
        warehouseId,
        code: validatedData.code 
      }
    })

    if (existingZone) {
      return createErrorResponse('Zone with this code already exists in this warehouse', 400)
    }

    // Check if total zone capacity exceeds warehouse capacity
    if (warehouse.capacity) {
      const existingZonesCapacity = await prisma.warehouseZone.aggregate({
        where: { warehouseId },
        _sum: { capacity: true }
      })

      const totalCapacity = (existingZonesCapacity._sum.capacity || 0) + validatedData.capacity
      if (totalCapacity > warehouse.capacity) {
        return createErrorResponse(`Total zone capacity (${totalCapacity}) exceeds warehouse capacity (${warehouse.capacity})`, 400)
      }
    }

    // Create zone
    const newZone = await prisma.warehouseZone.create({
      data: {
        ...validatedData,
        warehouseId
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_WAREHOUSE_ZONE',
        entityType: 'warehouse_zones',
        entityId: newZone.id,
        newValues: validatedData
      }
    })

    return createResponse(newZone, 201, 'Warehouse zone created successfully')
  } catch (error) {
    console.error('Create warehouse zone error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create warehouse zone', 500)
  }
})
