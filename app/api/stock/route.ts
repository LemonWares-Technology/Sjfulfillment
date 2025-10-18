import { NextRequest } from 'next/server'

import { JWTPayload } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { createStockItemSchema } from '@/app/lib/validations'
import { notificationService, NotificationTemplates } from '@/app/lib/notification-service'

// GET /api/stock
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const lowStock = searchParams.get('lowStock')
    const expired = searchParams.get('expired')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const warehouse = searchParams.get('warehouse')
    const stockLevel = searchParams.get('stockLevel')

    const where: any = {}

    // Filter by merchant if not admin and not warehouse staff
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF') {
      where.product = {
        merchantId: user.merchantId
      }
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId
    if (lowStock === 'true') {
      where.availableQuantity = { lte: prisma.stockItem.fields.reorderLevel }
    }
    if (expired === 'true') {
      where.expiryDate = { lt: new Date() }
    }

    // Add search functionality
    if (search) {
      where.product = {
        ...where.product,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    // Add category filter
    if (category) {
      where.product = {
        ...where.product,
        category: category
      }
    }

    // Add warehouse name filter
    if (warehouse) {
      where.warehouse = {
        name: { contains: warehouse, mode: 'insensitive' }
      }
    }

    // Add stock level filter
    if (stockLevel) {
      switch (stockLevel) {
        case 'low':
          where.availableQuantity = { lte: prisma.stockItem.fields.reorderLevel }
          break
        case 'out':
          where.availableQuantity = 0
          break
        case 'high':
          where.availableQuantity = { gt: prisma.stockItem.fields.reorderLevel }
          break
      }
    }

    const skip = (page - 1) * limit

    const [stockItems, total] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              brand: true,
              unitPrice: true,
              hasExpiry: true,
              isPerishable: true,
              merchant: {
                select: {
                  id: true,
                  businessName: true
                }
              }
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true
            }
          },
          stockMovements: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.stockItem.count({ where })
    ])

    return createResponse({
      stockItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 200, 'Stock items retrieved successfully')
  } catch (error) {
    console.error('Get stock error:', error)
    return createErrorResponse('Failed to retrieve stock items', 500)
  }
})

// POST /api/stock
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const body = await request.json()
    const stockData = createStockItemSchema.parse(body)

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: stockData.productId },
      select: { id: true, merchantId: true, name: true }
    })

    if (!product) {
      return createErrorResponse('Product not found', 404)
    }

    // Check permissions - merchant staff can only add stock to their own products
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF' && product.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouseLocation.findUnique({
      where: { id: stockData.warehouseId },
      select: { id: true, name: true }
    })

    if (!warehouse) {
      return createErrorResponse('Warehouse not found', 404)
    }

    // Check if stock item already exists for this product/warehouse/batch
    const existingStock = await prisma.stockItem.findFirst({
      where: {
        productId: stockData.productId,
        warehouseId: stockData.warehouseId,
        batchNumber: stockData.batchNumber || null
      }
    })

    if (existingStock) {
      return createErrorResponse('Stock item already exists for this product/warehouse/batch combination', 400)
    }

    // Create stock item
    const newStockItem = await prisma.stockItem.create({
      data: {
        ...stockData,
        availableQuantity: stockData.quantity
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            merchant: {
              select: {
                id: true,
                businessName: true
              }
            }
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    // Create initial stock movement
    await prisma.stockMovement.create({
      data: {
        stockItemId: newStockItem.id,
        movementType: 'STOCK_IN',
        quantity: stockData.quantity,
        referenceType: 'INITIAL_STOCK',
        performedBy: user.userId,
        notes: 'Initial stock entry'
      }
    })

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_STOCK_ITEM',
        entityType: 'stock_items',
        entityId: newStockItem.id,
        newValues: stockData
      }
    })

    return createResponse(newStockItem, 201, 'Stock item created successfully')
  } catch (error) {
    console.error('Create stock item error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create stock item', 500)
  }
})
