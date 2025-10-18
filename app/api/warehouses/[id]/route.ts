import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateWarehouseSchema } from '../../../lib/validations'

// GET /api/warehouses/[id]
export const GET = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params

    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      include: {
        merchants: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
            onboardingStatus: true
          }
        },
        zones: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        stockItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                brand: true,
                merchant: {
                  select: {
                    id: true,
                    businessName: true
                  }
                }
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 20
        },
        orders: {
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: {
            stockItems: true,
            orders: true,
            zones: true
          }
        }
      }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    return createResponse(warehouse, 200, 'Warehouse retrieved successfully')
  } catch (error) {
    console.error('Get warehouse error:', error)
    return createErrorResponse('Failed to retrieve warehouse', 500)
  }
})

// PUT /api/warehouses/[id]
export const PUT = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params
    const body = await request.json()
    const updateData = updateWarehouseSchema.parse(body)

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, code: true }
    })

    if (!existingWarehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Check if new code conflicts
    if (updateData.code && updateData.code !== existingWarehouse.code) {
      const codeExists = await prisma.warehouseLocation.findUnique({
        where: { code: updateData.code }
      })
      if (codeExists) {
        return createErrorResponse('Warehouse with this code already exists', 400)
      }
    }

    // Update warehouse
    const updatedWarehouse = await prisma.warehouseLocation.update({
      where: { id: warehouseId },
      data: updateData,
      include: {
        merchants: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_WAREHOUSE',
        entityType: 'warehouse_locations',
        entityId: warehouseId,
        newValues: updateData
      }
    })

    return createResponse(updatedWarehouse, 200, 'Warehouse updated successfully')
  } catch (error) {
    console.error('Update warehouse error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update warehouse', 500)
  }
})

// DELETE /api/warehouses/[id]
export const DELETE = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true }
    })

    if (!existingWarehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Check if warehouse has active stock or orders
    const [stockCount, orderCount] = await Promise.all([
      prisma.stockItem.count({
        where: {
          warehouseId,
          quantity: { gt: 0 }
        }
      }),
      prisma.order.count({
        where: {
          warehouseId,
          status: { not: 'CANCELLED' }
        }
      })
    ])

    if (stockCount > 0 || orderCount > 0) {
      return createErrorResponse('Cannot delete warehouse with active stock or orders', 400)
    }

    // Soft delete by deactivating
    await prisma.warehouseLocation.update({
      where: { id: warehouseId },
      data: { isActive: false }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_WAREHOUSE',
        entityType: 'warehouse_locations',
        entityId: warehouseId
      }
    })

    return createResponse(null, 200, 'Warehouse deactivated successfully')
  } catch (error) {
    console.error('Delete warehouse error:', error)
    return createErrorResponse('Failed to delete warehouse', 500)
  }
})

// POST /api/warehouses/[id]/zones
export const POST = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: warehouseId } = await params
    const body = await request.json()
    const { name, code, description, capacity } = body

    if (!name || !code) {
      return createErrorResponse('Name and code are required', 400)
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Check if zone code already exists in this warehouse
    const existingZone = await prisma.warehouseZone.findFirst({
      where: {
        warehouseId,
        code
      }
    })

    if (existingZone) {
      return createErrorResponse('Zone with this code already exists in this warehouse', 400)
    }

    // Create zone
    const newZone = await prisma.warehouseZone.create({
      data: {
        warehouseId,
        name,
        code,
        description,
        capacity
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_WAREHOUSE_ZONE',
        entityType: 'warehouse_zones',
        entityId: newZone.id,
        newValues: { name, code, description, capacity }
      }
    })

    return createResponse(newZone, 201, 'Warehouse zone created successfully')
  } catch (error) {
    console.error('Create warehouse zone error:', error)
    return createErrorResponse('Failed to create warehouse zone', 500)
  }
})
