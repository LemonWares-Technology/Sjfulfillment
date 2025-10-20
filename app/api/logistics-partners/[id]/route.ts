import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateLogisticsPartnerSchema } from '../../../lib/validations'

// GET /api/logistics-partners/[id]
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: partnerId } = await params

    const partner = await prisma.logisticsPartner.findUnique({
      where: { id: partnerId },
      include: {
        deliveryMetrics: {
          include: {
            logisticsPartner: {
              select: {
                id: true,
                companyName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!partner) {
      return createErrorResponse('Logistics partner not found', 404)
    }

    return createResponse(partner, 200, 'Logistics partner retrieved successfully')
  } catch (error) {
    console.error('Get logistics partner error:', error)
    return createErrorResponse('Failed to retrieve logistics partner', 500)
  }
})

// PUT /api/logistics-partners/[id]
export const PUT = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: partnerId } = await params
    const body = await request.json()
    const updateData = updateLogisticsPartnerSchema.parse(body)

    // Check if partner exists
    const existingPartner = await prisma.logisticsPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, email: true, cacNumber: true }
    })

    if (!existingPartner) {
      return createErrorResponse('Logistics partner not found', 404)
    }

    // Check if new email conflicts
    if (updateData.email && updateData.email !== existingPartner.email) {
      const emailExists = await prisma.logisticsPartner.findUnique({
        where: { email: updateData.email }
      })
      if (emailExists) {
        return createErrorResponse('Logistics partner with this email already exists', 400)
      }
    }

    // Update partner
    const updatedPartner = await prisma.logisticsPartner.update({
      where: { id: partnerId },
      data: updateData
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_LOGISTICS_PARTNER',
        entityType: 'logistics_partners',
        entityId: partnerId,
        newValues: updateData
      }
    })

    return createResponse(updatedPartner, 200, 'Logistics partner updated successfully')
  } catch (error) {
    console.error('Update logistics partner error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update logistics partner', 500)
  }
})

// DELETE /api/logistics-partners/[id]
export const DELETE = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: partnerId } = await params

    // Check if partner exists
    const existingPartner = await prisma.logisticsPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, companyName: true }
    })

    if (!existingPartner) {
      return createErrorResponse('Logistics partner not found', 404)
    }

    // Check if partner has active deliveries
    const activeDeliveries = await prisma.deliveryMetrics.count({
      where: {
        logisticsPartnerId: partnerId,
        deliveryStatus: { not: 'DELIVERED' }
      }
    })

    if (activeDeliveries > 0) {
      return createErrorResponse('Cannot delete logistics partner with active deliveries', 400)
    }

    // Soft delete by changing status
    await prisma.logisticsPartner.delete({
      where: { id: partnerId },
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_LOGISTICS_PARTNER',
        entityType: 'logistics_partners',
        entityId: partnerId
      }
    })

    return createResponse(null, 200, 'Logistics partner suspended successfully')
  } catch (error) {
    console.error('Delete logistics partner error:', error)
    return createErrorResponse('Failed to delete logistics partner', 500)
  }
})

// POST /api/logistics-partners/[id]/delivery-metrics
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: partnerId } = await params
    const body = await request.json()
    const { orderId, pickupTime, deliveryTime, deliveryAttempts, deliveryStatus, notes } = body

    if (!orderId || !deliveryStatus) {
      return createErrorResponse('Order ID and delivery status are required', 400)
    }

    // Check if partner exists
    const partner = await prisma.logisticsPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, companyName: true }
    })

    if (!partner) {
      return createErrorResponse('Logistics partner not found', 404)
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true }
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // Create delivery metrics
    const deliveryMetrics = await prisma.deliveryMetrics.create({
      data: {
        logisticsPartnerId: partnerId,
        orderId,
        pickupTime: pickupTime ? new Date(pickupTime) : null,
        deliveryTime: deliveryTime ? new Date(deliveryTime) : null,
        deliveryAttempts: deliveryAttempts || 1,
        deliveryStatus,
        notes
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_DELIVERY_METRICS',
        entityType: 'delivery_metrics',
        entityId: deliveryMetrics.id,
        newValues: { orderId, deliveryStatus, deliveryAttempts }
      }
    })

    return createResponse(deliveryMetrics, 201, 'Delivery metrics recorded successfully')
  } catch (error) {
    console.error('Create delivery metrics error:', error)
    return createErrorResponse('Failed to record delivery metrics', 500)
  }
})
