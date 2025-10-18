import { NextRequest } from 'next/server'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { ensureProductStockItem } from '@/app/lib/warehouse-utils'

// POST /api/admin/fix-products - Fix products without stock items
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    console.log('Fixing existing products without stock items...')
    
    // Find products without stock items
    const productsWithoutStock = await prisma.product.findMany({
      where: {
        stockItems: {
          none: {}
        }
      },
      include: {
        _count: {
          select: {
            stockItems: true
          }
        }
      }
    })
    
    console.log(`Found ${productsWithoutStock.length} products without stock items`)
    
    if (productsWithoutStock.length === 0) {
      return createResponse({
        message: 'All products already have stock items!',
        fixed: 0,
        total: 0
      }, 200, 'No products need fixing')
    }
    
    // Create stock items for products without them
    let created = 0
    const errors = []
    
    for (const product of productsWithoutStock) {
      try {
        await ensureProductStockItem(product.id, 0)
        created++
        console.log(`Created stock item for: ${product.name}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${product.name}: ${errorMessage}`)
        console.error(`Failed to create stock item for ${product.name}:`, errorMessage)
      }
    }
    
    const result = {
      message: `Successfully created ${created} stock items`,
      fixed: created,
      total: productsWithoutStock.length,
      errors: errors.length > 0 ? errors : undefined
    }
    
    console.log(`✅ Successfully created ${created} stock items`)
    
    return createResponse(result, 200, 'Products fixed successfully')
    
  } catch (error) {
    console.error('Error fixing products:', error)
    return createErrorResponse('Failed to fix products', 500)
  }
})

// GET /api/admin/fix-products - Check products status
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest) => {
  try {
    const [totalProducts, productsWithStock, productsWithoutStock] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({
        where: {
          stockItems: {
            some: {}
          }
        }
      }),
      prisma.product.count({
        where: {
          stockItems: {
            none: {}
          }
        }
      })
    ])

    const status = {
      totalProducts,
      productsWithStock,
      productsWithoutStock,
      needsFixing: productsWithoutStock > 0,
      message: productsWithoutStock > 0 
        ? `${productsWithoutStock} products need stock items` 
        : 'All products have stock items'
    }

    return createResponse(status, 200, 'Products status retrieved')
  } catch (error) {
    console.error('Error checking products status:', error)
    return createErrorResponse('Failed to check products status', 500)
  }
})

