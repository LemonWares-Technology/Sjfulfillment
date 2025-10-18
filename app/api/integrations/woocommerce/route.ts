import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { WooCommerceIntegration } from '@/app/lib/integration-utils'
import { z } from 'zod'

const syncProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.string().optional(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional(),
  stock_quantity: z.number().optional(),
  sku: z.string().optional(),
  weight: z.string().optional(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string()
  })).optional(),
  attributes: z.array(z.object({
    id: z.number(),
    name: z.string(),
    options: z.array(z.string())
  })).optional(),
  images: z.array(z.object({
    id: z.number(),
    src: z.string()
  })).optional()
})

const syncOrderSchema = z.object({
  id: z.number(),
  order_number: z.number(),
  status: z.string(),
  billing: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string().optional()
  }),
  shipping: z.object({
    first_name: z.string(),
    last_name: z.string(),
    address_1: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postcode: z.string()
  }),
  line_items: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    quantity: z.number(),
    price: z.string()
  })),
  shipping_total: z.string().optional(),
  payment_method: z.string().optional()
})

// POST /api/integrations/woocommerce/sync-product - Sync product from WooCommerce
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/integrations/woocommerce/sync-product',
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
    const validatedData = syncProductSchema.parse(body)

    // Sync product from WooCommerce
    const product = await WooCommerceIntegration.syncProductFromWooCommerce(
      apiKey.merchantId,
      validatedData
    )

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/woocommerce/sync-product',
      'POST',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      product
    )

    return createResponse(product, 200, 'Product synced successfully from WooCommerce')
  } catch (error) {
    console.error('WooCommerce sync product error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/woocommerce/sync-product',
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
