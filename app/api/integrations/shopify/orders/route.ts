import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { ShopifyIntegration } from '@/app/lib/integration-utils'
import { z } from 'zod'

const syncOrderSchema = z.object({
  id: z.number(),
  order_number: z.number(),
  status: z.string(),
  customer: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string().optional()
  }),
  shipping_address: z.object({
    first_name: z.string(),
    last_name: z.string(),
    address1: z.string(),
    city: z.string(),
    province: z.string(),
    country: z.string(),
    zip: z.string()
  }),
  line_items: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    quantity: z.number(),
    price: z.string()
  })),
  shipping_lines: z.array(z.object({
    price: z.string()
  })).optional()
})

// POST /api/integrations/shopify/orders - Create order from Shopify
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'orders:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/integrations/shopify/orders',
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
    const validatedData = syncOrderSchema.parse(body)

    // Create order from Shopify
    const order = await ShopifyIntegration.createOrderFromShopify(
      apiKey.merchantId,
      validatedData
    )

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/shopify/orders',
      'POST',
      201,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      order
    )

    return createResponse(order, 201, 'Order created successfully from Shopify')
  } catch (error) {
    console.error('Shopify create order error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/shopify/orders',
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
