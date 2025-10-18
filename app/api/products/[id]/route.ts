import { NextRequest } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { createResponse, createErrorResponse, withRole } from '../../../lib/api-utils'
import { updateProductSchema } from '../../../lib/validations'
import { Prisma } from '../../../generated/prisma'
import { ensureProductStockItem } from '../../../lib/warehouse-utils'

// GET /api/products/[id]
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: productId } = await params

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessEmail: true
          }
        },
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
            },
            stockMovements: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        serialNumbers: {
          select: {
            id: true,
            serialNo: true,
            status: true,
            createdAt: true
          }
        },
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true
              }
            }
          },
          orderBy: { order: { createdAt: 'desc' } },
          take: 10
        }
      }
    })

    if (!product) {
      return createErrorResponse('Product not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && product.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    return createResponse(product, 200, 'Product retrieved successfully')
  } catch (error) {
    console.error('Get product error:', error)
    return createErrorResponse('Failed to retrieve product', 500)
  }
})

// PUT /api/products/[id]
export const PUT = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: productId } = await params
    const body = await request.json()
    
    console.log('Product update request body:', body)
    
    // Convert string numbers to numbers and handle null values
    const processedBody = {
      ...body,
      weight: body.weight ? parseFloat(body.weight) : undefined,
      unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : undefined,
      description: body.description || null,
      category: body.category || null,
      brand: body.brand || null,
      barcodeData: body.barcodeData || null,
      // Handle dimensions properly - only include if it's a valid object
      ...(body.dimensions && typeof body.dimensions === 'object' && 
          body.dimensions.length && body.dimensions.width && body.dimensions.height ? 
          { dimensions: body.dimensions } : {})
    }
    
    console.log('Processed body for validation:', processedBody)
    
    const updateData = updateProductSchema.parse(processedBody)

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, merchantId: true, sku: true }
    })

    if (!existingProduct) {
      return createErrorResponse('Product not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && existingProduct.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Check if new SKU conflicts
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku }
      })
      if (skuExists) {
        return createErrorResponse('Product with this SKU already exists', 400)
      }
    }

    // Filter out null values for Prisma
    const prismaUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== null)
    )

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: prismaUpdateData,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    // Handle stock quantity update if provided
    if (body.quantity !== undefined && body.quantity !== null) {
      console.log('Updating stock quantity for product:', productId, 'quantity:', body.quantity)
      
      const stockItems = await prisma.stockItem.findMany({
        where: { productId }
      })
      
      console.log('Found stock items:', stockItems.length)

      if (stockItems.length > 0) {
        // Update existing stock items
        const updateResult = await prisma.stockItem.updateMany({
          where: { productId },
          data: {
            quantity: parseInt(body.quantity),
            availableQuantity: parseInt(body.quantity),
            reservedQuantity: 0 // Reset reserved quantity when updating via product edit
          }
        })
        
        console.log('Updated stock items:', updateResult.count)

        // Create stock movement record
        for (const stockItem of stockItems) {
          await prisma.stockMovement.create({
            data: {
              stockItemId: stockItem.id,
              movementType: 'STOCK_IN',
              quantity: parseInt(body.quantity),
              referenceType: 'PRODUCT_UPDATE',
              performedBy: user.userId,
              notes: 'Stock quantity updated via product edit'
            }
          })
        }
      } else {
        // Create new stock item if none exists
        let warehouse = await prisma.warehouseLocation.findFirst({
          where: { isActive: true }
        })
        
        // If no warehouse exists, create a default one
        if (!warehouse) {
          console.log('No active warehouse found, creating default warehouse...')
          warehouse = await prisma.warehouseLocation.create({
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
          console.log('Created default warehouse:', warehouse.name)
        }
        
        console.log('No stock items found, creating new one. Warehouse:', warehouse?.name)

        if (warehouse) {
          const newStockItem = await prisma.stockItem.create({
            data: {
              productId,
              warehouseId: warehouse.id,
              quantity: parseInt(body.quantity),
              availableQuantity: parseInt(body.quantity),
              reservedQuantity: 0,
              reorderLevel: 10,
              maxStockLevel: 100
            }
          })
          
          console.log('Created new stock item:', newStockItem.id)
          
          // Create initial stock movement
          await prisma.stockMovement.create({
            data: {
              stockItemId: newStockItem.id,
              movementType: 'STOCK_IN',
              quantity: parseInt(body.quantity),
              referenceType: 'PRODUCT_UPDATE',
              performedBy: user.userId,
              notes: 'Initial stock quantity set via product edit'
            }
          })
        }
      }
    }


    // Log the change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'UPDATE_PRODUCT',
        entityType: 'products',
        entityId: productId,
        newValues: updateData
      }
    })

    return createResponse(updatedProduct, 200, 'Product updated successfully')
  } catch (error) {
    console.error('Update product error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to update product', 500)
  }
})

// DELETE /api/products/[id]
export const DELETE = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: productId } = await params

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, merchantId: true, name: true }
    })

    if (!existingProduct) {
      return createErrorResponse('Product not found', 404)
    }

    // Check permissions
    if (user.role !== 'SJFS_ADMIN' && existingProduct.merchantId !== user.merchantId) {
      return createErrorResponse('Forbidden', 403)
    }

    // Delete all related stock movements first
    await prisma.stockMovement.deleteMany({
      where: {
        stockItem: {
          productId
        }
      }
    })

    // Delete all related stock items
    await prisma.stockItem.deleteMany({
      where: { productId }
    })

    // Actually delete the product from database
    await prisma.product.delete({
      where: { id: productId }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        user: {
          connect: { id: user.userId }
        },
        action: 'DELETE_PRODUCT',
        entityType: 'products',
        entityId: productId
      }
    })

    return createResponse(null, 200, 'Product deleted successfully')
  } catch (error) {
    console.error('Delete product error:', error)
    return createErrorResponse('Failed to delete product', 500)
  }
})