import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }).optional(),
  unitPrice: z.number().positive().optional(),
  hasExpiry: z.boolean().optional().default(false),
  isPerishable: z.boolean().optional().default(false),
  barcodeData: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
  sku: z.string().optional(), // Optional - will be auto-generated if not provided
  quantity: z.number().int().positive().optional().default(0), // Initial stock quantity
  warehouseId: z.string().optional() // Warehouse for initial stock
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }).optional(),
  unitPrice: z.number().positive().optional(),
  hasExpiry: z.boolean().optional(),
  isPerishable: z.boolean().optional(),
  barcodeData: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().optional()
})

// GET /api/external/products - List products for external API
export const GET = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:read')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/products',
        'GET',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100 per page
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    const where: any = {
      merchantId: apiKey.merchantId
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
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          brand: true,
          weight: true,
          dimensions: true,
          unitPrice: true,
          isActive: true,
          hasExpiry: true,
          isPerishable: true,
          barcodeData: true,
          images: true,
          createdAt: true,
          updatedAt: true,
          stockItems: {
            select: {
              id: true,
              quantity: true,
              availableQuantity: true,
              reservedQuantity: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  city: true,
                  state: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])

    const response = {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/products',
      'GET',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      response
    )

    return createResponse(response, 200, 'Products retrieved successfully')
  } catch (error) {
    console.error('External get products error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/products',
      'GET',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to retrieve products', 500)
  }
})

// POST /api/external/products - Create product via external API
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/products',
        'POST',
        403,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Insufficient permissions'
      )
      return createErrorResponse('Insufficient permissions', 403)
    }

    const body = await request.json()
    const validatedData = createProductSchema.parse(body)

    // Get merchant's primary warehouse for SKU generation
    const merchant = await prisma.merchant.findUnique({
      where: { id: apiKey.merchantId },
      include: {
        warehouses: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    })

    if (!merchant) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/products',
        'POST',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Merchant not found'
      )
      return createErrorResponse('Merchant not found', 404)
    }

    // Generate auto SKU if not provided
    let sku = validatedData.sku
    if (!sku) {
      const warehouseCode = merchant.warehouses[0]?.city || merchant.city || 'Lagos'
      sku = `EXT-${warehouseCode.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/external/products',
        'POST',
        400,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Product with this SKU already exists'
      )
      return createErrorResponse('Product with this SKU already exists', 400)
    }

    // Extract quantity and warehouseId from validated data
    const { quantity, warehouseId, ...productData } = validatedData

    // Create product
    const newProduct = await prisma.product.create({
      data: {
        ...productData,
        sku,
        merchantId: apiKey.merchantId
      },
      include: {
        stockItems: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
                city: true,
                state: true
              }
            }
          }
        }
      }
    })

    // Add initial stock if quantity is provided
    if (quantity && quantity > 0) {
      const targetWarehouseId = warehouseId || merchant.warehouses[0]?.id
      
      if (targetWarehouseId) {
        await prisma.stockItem.create({
          data: {
            productId: newProduct.id,
            warehouseId: targetWarehouseId,
            quantity,
            availableQuantity: quantity,
            reservedQuantity: 0
          }
        })

        // Create stock movement
        await prisma.stockMovement.create({
          data: {
            stockItemId: newProduct.id,
            movementType: 'STOCK_IN',
            quantity,
            referenceType: 'API_CREATE',
            referenceId: newProduct.id,
            notes: 'Initial stock from external API'
          }
        })
      }
    }

    const response = {
      id: newProduct.id,
      sku: newProduct.sku,
      name: newProduct.name,
      description: newProduct.description,
      category: newProduct.category,
      brand: newProduct.brand,
      weight: newProduct.weight,
      dimensions: newProduct.dimensions,
      unitPrice: newProduct.unitPrice,
      isActive: newProduct.isActive,
      hasExpiry: newProduct.hasExpiry,
      isPerishable: newProduct.isPerishable,
      barcodeData: newProduct.barcodeData,
      images: newProduct.images,
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt,
      stockItems: newProduct.stockItems
    }

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/products',
      'POST',
      201,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      response
    )

    return createResponse(response, 201, 'Product created successfully')
  } catch (error) {
    console.error('External create product error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/external/products',
      'POST',
      statusCode,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      errorMessage
    )

    return createErrorResponse(errorMessage, statusCode)
  }
})
