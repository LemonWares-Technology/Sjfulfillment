import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { parse } from 'csv-parse/sync'

interface OrderRow {
  customerName: string
  customerEmail: string
  customerPhone: string
  productSku: string
  quantity: number
  unitPrice?: number
  notes?: string
}

interface UploadResult {
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  errors: string[]
  createdOrders: any[]
}

// POST /api/orders/bulk-upload
export const POST = withRole(
  ["SJFS_ADMIN", "MERCHANT_ADMIN", "MERCHANT_STAFF"],
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
        createdOrders: []
      }

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const rowNumber = i + 2 // +2 because of header and 0-based index

        try {
          // Map CSV columns to our interface
          const orderData: OrderRow = {
            customerName: record['Customer Name'] || record['customer name'] || record['name'] || '',
            customerEmail: record['Customer Email'] || record['customer email'] || record['email'] || '',
            customerPhone: record['Customer Phone'] || record['customer phone'] || record['phone'] || '',
            productSku: record['Product SKU'] || record['product sku'] || record['sku'] || '',
            quantity: parseInt(record['Quantity'] || record['quantity'] || '0'),
            unitPrice: parseFloat(record['Unit Price'] || record['unit price'] || record['price'] || '0'),
            notes: record['Notes'] || record['notes'] || record['description'] || ''
          }

          // Validate required fields
          if (!orderData.customerName) {
            throw new Error('Customer name is required')
          }
          if (!orderData.customerEmail) {
            throw new Error('Customer email is required')
          }
          if (!orderData.productSku) {
            throw new Error('Product SKU is required')
          }
          if (orderData.quantity <= 0) {
            throw new Error('Quantity must be greater than 0')
          }

          // Find product
          const product = await prisma.product.findFirst({
            where: {
              sku: orderData.productSku,
              ...(user.role !== 'SJFS_ADMIN' ? { merchantId: user.merchantId } : {})
            }
          })

          if (!product) {
            throw new Error(`Product with SKU "${orderData.productSku}" not found`)
          }

          // Check stock availability and get warehouse
          const stockItem = await prisma.stockItem.findFirst({
            where: {
              productId: product.id,
              ...(user.role !== 'SJFS_ADMIN' ? { 
                warehouse: { merchants: { some: { id: user.merchantId } } }
              } : {})
            },
            include: {
              warehouse: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          })

          if (!stockItem || stockItem.availableQuantity < orderData.quantity) {
            throw new Error(`Insufficient stock for product "${orderData.productSku}"`)
          }

          // Calculate total amount
          const unitPrice = orderData.unitPrice || product.unitPrice
          const totalAmount = unitPrice * orderData.quantity

          // Create or find customer
          let customer = await prisma.customer.findFirst({
            where: {
              email: orderData.customerEmail,
              ...(user.role !== 'SJFS_ADMIN' ? { merchantId: user.merchantId } : {})
            }
          })

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                name: orderData.customerName,
                email: orderData.customerEmail,
                phone: orderData.customerPhone,
                merchantId: user.merchantId || undefined
              }
            })
          }

          // Generate order number
          const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

          // Create order
          const order = await prisma.order.create({
            data: {
              orderNumber,
              customerId: customer.id,
              merchantId: user.merchantId || undefined,
              warehouseId: stockItem.warehouse.id, // Assign warehouse from stock
              totalAmount,
              status: 'PENDING',
              customerName: orderData.customerName,
              customerEmail: orderData.customerEmail,
              customerPhone: orderData.customerPhone,
              notes: orderData.notes,
              orderItems: {
                create: {
                  productId: product.id,
                  quantity: orderData.quantity,
                  unitPrice,
                  totalPrice: totalAmount
                }
              }
            },
            include: {
              customer: true,
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          })

          // Update stock
          await prisma.stockItem.update({
            where: { id: stockItem.id },
            data: {
              quantity: stockItem.quantity - orderData.quantity,
              reservedQuantity: stockItem.reservedQuantity + orderData.quantity
            }
          })

          result.successful++
          result.createdOrders.push(order)

        } catch (error) {
          result.failed++
          result.errors.push(`Row ${rowNumber}: ${error.message}`)
        }
      }

      result.success = result.successful > 0

      // Log the bulk upload
      await prisma.auditLog.create({
        data: {
          user: { connect: { id: user.userId } },
          action: 'BULK_ORDER_UPLOAD',
          entityType: 'Order',
          entityId: 'bulk-upload',
          newValues: {
            totalProcessed: result.totalProcessed,
            successful: result.successful,
            failed: result.failed,
            filename: file.name,
            fileSize: file.size
          }
        }
      })

      return createResponse(result, 200, 'Bulk upload completed')
    } catch (error) {
      console.error('Bulk upload error:', error)
      return createErrorResponse('Failed to process bulk upload', 500)
    }
  }
)
