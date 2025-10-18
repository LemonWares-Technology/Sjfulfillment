import { NextRequest } from 'next/server'

import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createProductSchema } from '@/app/lib/validations'
import SKUGenerator from '@/app/lib/sku-generator'
import { ensureProductStockItem } from '@/app/lib/warehouse-utils'

// GET /api/products
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    const where: any = {}

    // Filter by merchant if not admin and not warehouse staff
    if (user.role !== 'SJFS_ADMIN' && user.role !== 'WAREHOUSE_STAFF') {
      where.merchantId = user.merchantId
    }

    if (category) where.category = category
    if (brand) where.brand = brand
    if (isActive !== null) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true
            }
          },
          stockItems: {
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
          serialNumbers: {
            where: { status: 'AVAILABLE' },
            select: {
              id: true,
              serialNo: true
            }
          },
          _count: {
            select: {
              orderItems: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)
    
    return createResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        totalPages, // Add this for compatibility
        totalItems: total, // Add this for compatibility
        currentPage: page // Add this for compatibility
      }
    }, 200, 'Products retrieved successfully')
  } catch (error) {
    console.error('Get products error:', error)
    return createErrorResponse('Failed to retrieve products', 500)
  }
})

// POST /api/products
export const POST = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    
    // Set merchant ID
    const merchantId = user.role === 'SJFS_ADMIN' ? body.merchantId : user.merchantId
    if (!merchantId) {
      return createErrorResponse('Merchant ID is required', 400)
    }

    // Get merchant's primary warehouse for SKU generation
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        warehouses: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    })

    if (!merchant) {
      return createErrorResponse('Merchant not found', 404)
    }

    // Generate auto SKU if not provided
    let sku = body.sku
    if (!sku) {
      const warehouseCode = merchant.warehouses[0]?.city || merchant.city || 'Lagos'
      sku = await SKUGenerator.generateSKU({
        warehouseCode,
        category: body.category,
        merchantId
      })
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return createErrorResponse('Product with this SKU already exists', 400)
    }

    // Prepare product data with auto-generated SKU
    const productData = {
      ...body,
      sku,
      merchantId
    }

    // Extract quantity from body (not in validation schema)
    const { quantity, ...productDataWithoutQuantity } = productData

    // Validate the data
    const validatedData = createProductSchema.parse(productDataWithoutQuantity)

    // Create product
    const newProduct = await prisma.product.create({
      data: {
        ...validatedData,
        merchant: {
          connect: { id: merchantId }
        }
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    // Always create initial stock item (even if quantity is 0)
    const initialQuantity = quantity || 0
    
    // Get any active warehouse (prefer merchant's warehouse, fallback to any)
    let warehouse = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        warehouses: {
          where: { isActive: true },
          take: 1
        }
      }
    })

    // If merchant has no warehouses, get any active warehouse
    if (!warehouse?.warehouses[0]) {
      let anyWarehouse = await prisma.warehouseLocation.findFirst({
        where: { isActive: true }
      })
      
      // If no warehouse exists, create a default one
      if (!anyWarehouse) {
        console.log('No active warehouse found, creating default warehouse...')
        anyWarehouse = await prisma.warehouseLocation.create({
          data: {
            name: 'Main Warehouse',
            code: 'MAIN-001',
            address: 'Default Address',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            isActive: true,
            capacity: 10000
          }
        })
        console.log('Created default warehouse:', anyWarehouse.name)
      }
      
      if (anyWarehouse) {
        const stockItem = await prisma.stockItem.create({
          data: {
            productId: newProduct.id,
            warehouseId: anyWarehouse.id,
            quantity: initialQuantity,
            availableQuantity: initialQuantity,
            reservedQuantity: 0,
            reorderLevel: 10, // Default reorder level
            maxStockLevel: 100 // Default max stock level
          }
        })

        // Create initial stock movement if quantity > 0
        if (initialQuantity > 0) {
          await prisma.stockMovement.create({
            data: {
              stockItemId: stockItem.id,
              movementType: 'STOCK_IN',
              quantity: initialQuantity,
              referenceType: 'INITIAL_STOCK',
              performedBy: user.userId,
              notes: 'Initial stock entry'
            }
          })
        }
      }
    } else {
      const stockItem = await prisma.stockItem.create({
        data: {
          productId: newProduct.id,
          warehouseId: warehouse.warehouses[0].id,
          quantity: initialQuantity,
          availableQuantity: initialQuantity,
          reservedQuantity: 0,
          reorderLevel: 10, // Default reorder level
          maxStockLevel: 100 // Default max stock level
        }
      })

      // Create initial stock movement if quantity > 0
      if (initialQuantity > 0) {
        await prisma.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            movementType: 'STOCK_IN',
            quantity: initialQuantity,
            referenceType: 'INITIAL_STOCK',
            performedBy: user.userId,
            notes: 'Initial stock entry'
          }
        })
      }
    }


    // Log the creation
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'CREATE_PRODUCT',
        entityType: 'products',
        entityId: newProduct.id,
        newValues: validatedData
      }
    })

    return createResponse(newProduct, 201, 'Product created successfully')
  } catch (error) {
    console.error('Create product error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create product', 500)
  }
})
