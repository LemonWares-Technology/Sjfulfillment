import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { parse } from 'csv-parse/sync'
import { createProductSchema } from '@/app/lib/validations'
import { SKUGenerator } from '@/app/lib/sku-generator'
import { ensureProductStockItem } from '@/app/lib/warehouse-utils'

interface ProductRow {
  name: string
  description: string
  category: string
  unitPrice: number
  weight: number
  length?: number
  width?: number
  height?: number
  initialStock?: number
  reorderPoint?: number
  sku?: string
}

interface UploadResult {
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  errors: string[]
  createdProducts: any[]
}

// POST /api/products/bulk-upload
export const POST = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN", "MERCHANT_STAFF", "WAREHOUSE_STAFF"],
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return createErrorResponse('No file provided', 400)
      }

      // Validate file type
      if (!file.name.endsWith('.csv')) {
        return createErrorResponse('Only CSV files are allowed', 400)
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return createErrorResponse('File size must be less than 10MB', 400)
      }

      // Read and parse CSV
      const text = await file.text()
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      const result: UploadResult = {
        success: false,
        totalProcessed: records.length,
        successful: 0,
        failed: 0,
        errors: [],
        createdProducts: []
      }

      // Get merchant ID
      let merchantId: string
      if (user.role === 'SJFS_ADMIN') {
        merchantId = formData.get('merchantId') as string
        if (!merchantId) {
          return createErrorResponse('Merchant ID is required for admin users', 400)
        }
      } else if (user.role === 'WAREHOUSE_STAFF') {
        // For warehouse staff, we need to get merchant ID from form data or use a default
        merchantId = formData.get('merchantId') as string
        if (!merchantId) {
          return createErrorResponse('Merchant ID is required for warehouse staff', 400)
        }
      } else {
        merchantId = user.merchantId
        if (!merchantId) {
          return createErrorResponse('Merchant ID is required', 400)
        }
      }

      // Get merchant's primary warehouse for SKU generation and stock creation
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

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const rowNumber = i + 2 // +2 because of header and 0-based index

        try {
          // Map CSV columns to our interface
          const productData: ProductRow = {
            name: record['Product Name'] || record['product name'] || record['name'] || '',
            description: record['Description'] || record['description'] || '',
            category: record['Category'] || record['category'] || '',
            unitPrice: parseFloat(record['Unit Price'] || record['unit price'] || record['price'] || '0'),
            weight: parseFloat(record['Weight'] || record['weight'] || '0'),
            length: record['Length'] ? parseFloat(record['Length']) : undefined,
            width: record['Width'] ? parseFloat(record['Width']) : undefined,
            height: record['Height'] ? parseFloat(record['Height']) : undefined,
            initialStock: record['Initial Stock'] ? parseInt(record['Initial Stock']) : 0,
            reorderPoint: record['Reorder Point'] ? parseInt(record['Reorder Point']) : 0,
            sku: record['SKU'] || record['sku'] || ''
          }

          // Validate required fields
          if (!productData.name) {
            throw new Error('Product name is required')
          }
          if (!productData.category) {
            throw new Error('Product category is required')
          }
          if (productData.unitPrice <= 0) {
            throw new Error('Unit price must be greater than 0')
          }
          if (productData.weight <= 0) {
            throw new Error('Weight must be greater than 0')
          }

          // Generate SKU if not provided
          let sku = productData.sku
          if (!sku) {
            const warehouseCode = merchant.warehouses[0]?.city || merchant.city || 'Lagos'
            sku = await SKUGenerator.generateSKU({
              warehouseCode,
              category: productData.category,
              merchantId
            })
          }

          // Check if SKU already exists
          const existingProduct = await prisma.product.findUnique({
            where: { sku }
          })

          if (existingProduct) {
            throw new Error(`Product with SKU "${sku}" already exists`)
          }

          // Prepare dimensions
          let dimensions = undefined
          if (productData.length && productData.width && productData.height) {
            dimensions = {
              length: productData.length,
              width: productData.width,
              height: productData.height
            }
          }

          // Create product
          const newProduct = await prisma.product.create({
            data: {
              name: productData.name,
              description: productData.description,
              category: productData.category,
              unitPrice: productData.unitPrice,
              weight: productData.weight,
              dimensions: dimensions,
              sku: sku,
              merchantId: merchantId,
              isActive: true
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

          // Always create stock item (even if initial stock is 0)
          const initialStock = productData.initialStock || 0
          await ensureProductStockItem(newProduct.id, initialStock)
          
          // Create stock movement if initial stock > 0
          if (initialStock > 0) {
            const stockItem = await prisma.stockItem.findFirst({
              where: { productId: newProduct.id }
            })
            
            if (stockItem) {
              await prisma.stockMovement.create({
                data: {
                  stockItemId: stockItem.id,
                  movementType: 'STOCK_IN',
                  quantity: initialStock,
                  referenceType: 'BULK_UPLOAD',
                  performedBy: user.userId,
                  notes: 'Initial stock from bulk upload'
                }
              })
            }
          }

          result.createdProducts.push(newProduct)
          result.successful++

        } catch (error) {
          result.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`Row ${rowNumber}: ${errorMessage}`)
        }
      }

      result.success = result.successful > 0

      // Log the bulk upload
      await prisma.auditLog.create({
        data: {
          user: {
            connect: { id: user.userId }
          },
          action: 'BULK_UPLOAD_PRODUCTS',
          entityType: 'products',
          entityId: result.createdProducts.map(p => p.id).join(','),
          newValues: {
            totalProcessed: result.totalProcessed,
            successful: result.successful,
            failed: result.failed,
            merchantId
          }
        }
      })

      return createResponse(result, 200, 'Bulk product upload completed')

    } catch (error) {
      console.error('Bulk product upload error:', error)
      return createErrorResponse('Failed to process bulk product upload', 500)
    }
  }
)

