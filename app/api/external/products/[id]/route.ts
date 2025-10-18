import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

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

// GET /api/external/products/[id] - Get specific product
export const GET = withApiKey(async (request: NextRequest, apiKey, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now()
  
  try {
    const { id: productId } = await params

    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:read')) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
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

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: apiKey.merchantId
      },
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
            reorderLevel: true,
            maxStockLevel: true,
            batchNumber: true,
            expiryDate: true,
            location: true,
            costPrice: true,
            lastStockIn: true,
            lastStockOut: true,
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

    if (!product) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
        'GET',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Product not found'
      )
      return createErrorResponse('Product not found', 404)
    }

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'GET',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      product
    )

    return createResponse(product, 200, 'Product retrieved successfully')
  } catch (error) {
    console.error('External get product error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'GET',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to retrieve product', 500)
  }
})

// PUT /api/external/products/[id] - Update product
export const PUT = withApiKey(async (request: NextRequest, apiKey, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now()
  
  try {
    const { id: productId } = await params

    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
        'PUT',
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
    const validatedData = updateProductSchema.parse(body)

    // Check if product exists and belongs to merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: apiKey.merchantId
      }
    })

    if (!existingProduct) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
        'PUT',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        body,
        null,
        'Product not found'
      )
      return createErrorResponse('Product not found', 404)
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: validatedData,
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
      }
    })

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'PUT',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      updatedProduct
    )

    return createResponse(updatedProduct, 200, 'Product updated successfully')
  } catch (error) {
    console.error('External update product error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'PUT',
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

// DELETE /api/external/products/[id] - Delete product
export const DELETE = withApiKey(async (request: NextRequest, apiKey, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now()
  
  try {
    const { id: productId } = await params

    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:delete')) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
        'DELETE',
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

    // Check if product exists and belongs to merchant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: apiKey.merchantId
      }
    })

    if (!existingProduct) {
      await logApiRequest(
        apiKey.apiKeyId,
        `/api/external/products/${productId}`,
        'DELETE',
        404,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        null,
        null,
        'Product not found'
      )
      return createErrorResponse('Product not found', 404)
    }

    // Soft delete by deactivating
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false }
    })

    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'DELETE',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      { id: productId, deleted: true }
    )

    return createResponse({ id: productId }, 200, 'Product deleted successfully')
  } catch (error) {
    console.error('External delete product error:', error)
    
    await logApiRequest(
      apiKey.apiKeyId,
      `/api/external/products/${productId}`,
      'DELETE',
      500,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      null,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return createErrorResponse('Failed to delete product', 500)
  }
})
