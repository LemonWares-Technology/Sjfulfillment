import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse } from '@/app/lib/api-utils'
import { withApiKey, hasApiPermission, logApiRequest } from '@/app/lib/api-key-auth'
import { ShopifyIntegration } from '@/app/lib/integration-utils'
import { z } from 'zod'

const syncProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  body_html: z.string().optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  variants: z.array(z.object({
    id: z.number(),
    price: z.string(),
    sku: z.string().optional(),
    weight: z.string().optional(),
    inventory_quantity: z.number().optional()
  })),
  images: z.array(z.object({
    id: z.number(),
    src: z.string()
  })).optional()
})

// POST /api/integrations/woocommerce/sync-product - Sync product from Shopify
export const POST = withApiKey(async (request: NextRequest, apiKey) => {
  const startTime = Date.now()
  
  try {
    // Check permissions
    if (!hasApiPermission(apiKey.permissions, 'products:write')) {
      await logApiRequest(
        apiKey.apiKeyId,
        '/api/integrations/shopify/sync-product',
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

    // Sync product from Shopify
    const product = await ShopifyIntegration.syncProductFromShopify(
      apiKey.merchantId,
      validatedData
    )

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/shopify/sync-product',
      'POST',
      200,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      body,
      product
    )

    return createResponse(product, 200, 'Product synced successfully from Shopify')
  } catch (error) {
    console.error('Shopify sync product error:', error)
    
    const errorMessage = error instanceof z.ZodError 
      ? 'Invalid input data' 
      : error instanceof Error ? error.message : 'Unknown error'
    
    const statusCode = error instanceof z.ZodError ? 400 : 500

    await logApiRequest(
      apiKey.apiKeyId,
      '/api/integrations/shopify/sync-product',
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
