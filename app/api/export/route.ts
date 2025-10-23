import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import jsPDF from 'jspdf'
import { logoBase64 } from '@/app/lib/logo-base64'

// GET /api/export
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'excel'
    const includeImages = searchParams.get('includeImages') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const itemIds = searchParams.get('itemIds')

    if (!type) {
      return createErrorResponse('Export type is required', 400)
    }

    // Build where clause based on user role and filters
    const whereClause: any = {}
    
    if (user.role === 'MERCHANT_ADMIN' && user.merchantId) {
      whereClause.merchantId = user.merchantId
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      }
    }

    if (itemIds) {
      const ids = itemIds.split(',')
      whereClause.id = { in: ids }
    }

    let data: any[] = []
    let filename = `${type}-export`

    // Fetch data based on type
    switch (type) {
      case 'products':
        data = await fetchProductsData(whereClause, includeImages)
        filename = 'products-export'
        break
      case 'orders':
        data = await fetchOrdersData(whereClause)
        filename = 'orders-export'
        break
      case 'customers':
        data = await fetchCustomersData(whereClause)
        filename = 'customers-export'
        break
      case 'returns':
        data = await fetchReturnsData(whereClause)
        filename = 'returns-export'
        break
      case 'warehouses':
        data = await fetchWarehousesData(whereClause)
        filename = 'warehouses-export'
        break
      default:
        return createErrorResponse('Unsupported export type', 400)
    }

    // Generate file based on format
    if (format === 'excel') {
      return generateExcelFile(data, filename, type)
    } else if (format === 'pdf') {
      return generatePDFFile(data, filename, type)
    } else if (format === 'csv') {
      return generateCSVFile(data, filename, type)
    }

    return createErrorResponse('Unsupported export format', 400)

  } catch (error) {
    console.error('Export error:', error)
    return createErrorResponse('Failed to generate export', 500)
  }
})

async function fetchProductsData(whereClause: any, includeImages: boolean) {
  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      merchant: {
        select: { businessName: true }
      },
      stockItems: {
        select: { quantity: true, availableQuantity: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return products.map(product => ({
    'Product ID': product.id,
    'Name': product.name,
    'SKU': product.sku,
    'Description': product.description,
    'Category': product.category,
    'Brand': product.brand,
    'Unit Price': Number(product.unitPrice || 0),
    'Weight': Number(product.weight || 0),
    'Dimensions': product.dimensions ? JSON.stringify(product.dimensions) : '',
    'Has Expiry': product.hasExpiry,
    'Is Perishable': product.isPerishable,
    'Barcode': product.barcodeData,
    'Images': includeImages ? (product.images || []).join('; ') : (product.images || []).length,
    'Total Stock': product.stockItems.reduce((sum, item) => sum + item.quantity, 0),
    'Available Stock': product.stockItems.reduce((sum, item) => sum + item.availableQuantity, 0),
    'Merchant': product.merchant?.businessName || 'N/A',
    'Status': product.isActive ? 'Active' : 'Inactive',
    'Created At': product.createdAt.toISOString().split('T')[0],
    'Updated At': product.updatedAt.toISOString().split('T')[0]
  }))
}

async function fetchOrdersData(whereClause: any) {
  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      merchant: {
        select: { businessName: true }
      },
      orderItems: {
        include: {
          product: {
            select: { name: true, sku: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return orders.map(order => ({
    'Order ID': order.id,
    'Order Number': order.orderNumber,
    'Customer Name': order.customerName,
    'Customer Email': order.customerEmail,
    'Customer Phone': order.customerPhone,
    'Shipping Address': order.shippingAddress ? JSON.stringify(order.shippingAddress) : '',
    'Total Amount': Number(order.totalAmount),
    'Delivery Fee': Number(order.deliveryFee),
    'Payment Method': order.paymentMethod,
    'Status': order.status,
    'Items Count': order.orderItems.length,
    'Items': order.orderItems.map(item => `${item.product.name} (${item.quantity}x)`).join('; '),
    'Merchant': order.merchant?.businessName || 'N/A',
    'Created At': order.createdAt.toISOString().split('T')[0],
    'Updated At': order.updatedAt.toISOString().split('T')[0]
  }))
}

async function fetchCustomersData(whereClause: any) {
  // Get unique customers from orders
  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      totalAmount: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // Group by customer email
  const customerMap = new Map()
  orders.forEach(order => {
    if (!customerMap.has(order.customerEmail)) {
      customerMap.set(order.customerEmail, {
        'Customer Name': order.customerName,
        'Email': order.customerEmail,
        'Phone': order.customerPhone,
        'Total Orders': 0,
        'Total Spent': 0,
        'First Order': order.createdAt.toISOString().split('T')[0],
        'Last Order': order.createdAt.toISOString().split('T')[0]
      })
    }
    
    const customer = customerMap.get(order.customerEmail)
    customer['Total Orders'] += 1
    customer['Total Spent'] += Number(order.totalAmount)
    if (order.createdAt < new Date(customer['First Order'])) {
      customer['First Order'] = order.createdAt.toISOString().split('T')[0]
    }
    if (order.createdAt > new Date(customer['Last Order'])) {
      customer['Last Order'] = order.createdAt.toISOString().split('T')[0]
    }
  })

  return Array.from(customerMap.values())
}

async function fetchReturnsData(whereClause: any) {
  const returns = await prisma.return.findMany({
    where: whereClause,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerEmail: true
        }
      },
    },
    orderBy: { createdAt: 'desc' }
  })

  return returns.map(returnItem => ({
    'Return ID': returnItem.id,
    'Return Number': returnItem.id,
    'Order Number': returnItem.order.orderNumber,
    'Customer Name': returnItem.order.customerName,
    'Customer Email': returnItem.order.customerEmail,
    'Reason': returnItem.reason,
    'Status': returnItem.status,
    'Refund Amount': Number(returnItem.refundAmount),
    'Items Count': 0,
    'Items': 'N/A',
    'Requested At': returnItem.createdAt.toISOString().split('T')[0],
    'Processed At': returnItem.updatedAt.toISOString().split('T')[0]
  }))
}

async function fetchWarehousesData(whereClause: any) {
  const warehouses = await prisma.warehouseLocation.findMany({
    where: whereClause,
    include: {
      zones: {
        select: {
          name: true,
          code: true,
          capacity: true,
          isActive: true
        }
      },
      merchants: {
        select: { businessName: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return warehouses.map(warehouse => ({
    'Warehouse ID': warehouse.id,
    'Name': warehouse.name,
    'Code': warehouse.code,
    'Address': warehouse.address,
    'City': warehouse.city,
    'State': warehouse.state,
    'Country': warehouse.country,
    'Capacity': warehouse.capacity,
    'Zones Count': warehouse.zones.length,
    'Zones': warehouse.zones.map(zone => 
      `${zone.name} - ${zone.capacity} units`
    ).join('; '),
    'Merchants Count': warehouse.merchants.length,
    'Merchants': warehouse.merchants.map(m => m.businessName).join('; '),
    'Status': warehouse.isActive ? 'Active' : 'Inactive',
    'Created At': warehouse.createdAt.toISOString().split('T')[0]
  }))
}

async function generateExcelFile(data: any[], filename: string, type: string): Promise<NextResponse> {
  const ExcelJS = require('exceljs')
  const workbook = new ExcelJS.Workbook()
  
  const worksheet = workbook.addWorksheet(`${type.charAt(0).toUpperCase() + type.slice(1)} Export`)
  
  if (data.length === 0) {
    worksheet.addRow(['No data available'])
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`
      }
    })
  }

  // Add headers
  const headers = Object.keys(data[0])
  worksheet.addRow(headers)

  // Style headers
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Add data
  data.forEach(row => {
    const values = headers.map(header => row[header])
    worksheet.addRow(values)
  })

  // Auto-fit columns
  worksheet.columns.forEach((column: any) => {
    let maxLength = 0
    column.eachCell({ includeEmpty: true }, (cell: any) => {
      const columnLength = cell.value ? cell.value.toString().length : 10
      if (columnLength > maxLength) {
        maxLength = columnLength
      }
    })
    column.width = Math.min(maxLength + 2, 50)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`
    }
  })
}

async function generatePDFFile(data: any[], filename: string, type: string): Promise<NextResponse> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // HEADER - Brand Banner
  doc.setFillColor(10, 10, 10) // black header for white logo
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Add logo instead of text
  try {
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 8, 40, 18)
    } else {
      // fallback to previous remote url if base64 not available
      doc.addImage('https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png', 'PNG', pageWidth / 2 - 20, 8, 40, 18)
    }
  } catch (error) {
    // Fallback to text if logo fails to load
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('SJFulfillment', pageWidth / 2, 18, { align: 'center' })
  }
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Export Report`, pageWidth / 2, 32, { align: 'center' })
  
  // Report metadata
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, 20, 45)
  doc.text(`Total Records: ${data.length}`, 20, 50)
  
  doc.setDrawColor(240, 140, 23)
  doc.setLineWidth(0.5)
  doc.line(20, 54, pageWidth - 20, 54)
  
  let yPos = 62
  
  // Type-specific formatting
  if (type === 'orders') {
    // Calculate summary stats
    const totalRevenue = data.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    const avgOrderValue = data.length > 0 ? totalRevenue / data.length : 0
    const statusCounts: any = {}
    data.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
    })
    
    // Summary Box
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('Orders Summary', 20, yPos + 10)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Orders: ${data.length}`, 25, yPos + 18)
    doc.text(`Total Revenue: NGN ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, yPos + 24)
    doc.text(`Avg Order Value: NGN ${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, yPos + 18)
    doc.text(`Delivered: ${statusCounts.DELIVERED || 0} | Pending: ${statusCounts.PENDING || 0}`, 120, yPos + 24)
    
    yPos += 38
    
    // Table Header
    doc.setFillColor(240, 140, 23)
    doc.rect(15, yPos, pageWidth - 30, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Order #', 18, yPos + 5.5)
    doc.text('Customer', 50, yPos + 5.5)
    doc.text('Status', 100, yPos + 5.5)
    doc.text('Amount', 130, yPos + 5.5)
    doc.text('Date', 165, yPos + 5.5)
    
    yPos += 8
    
    // Order rows
    data.forEach((order, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        
        // Header on new page
        doc.setFillColor(240, 140, 23)
        doc.rect(0, 0, pageWidth, 20, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.text(`SJFulfillment - ${type} Export (cont.)`, pageWidth / 2, 12, { align: 'center' })
        
        yPos = 30
        
        // Repeat table header
        doc.setFillColor(240, 140, 23)
        doc.rect(15, yPos, pageWidth - 30, 8, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Order #', 18, yPos + 5.5)
        doc.text('Customer', 50, yPos + 5.5)
        doc.text('Status', 100, yPos + 5.5)
        doc.text('Amount', 130, yPos + 5.5)
        doc.text('Date', 165, yPos + 5.5)
        yPos += 8
      }
      
      const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(15, yPos, pageWidth - 30, 7, 'F')
      
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text((order.orderNumber || order.id || 'N/A').toString().substring(0, 12), 18, yPos + 4.5)
      doc.text((order.customerName || 'Unknown').toString().substring(0, 18), 50, yPos + 4.5)
      
      // Status with color
      const statusColor = order.status === 'DELIVERED' ? [34, 197, 94] : 
                         order.status === 'PENDING' ? [251, 191, 36] : 
                         order.status === 'CANCELLED' ? [239, 68, 68] : [100, 100, 100]
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.setFont('helvetica', 'bold')
      doc.text(order.status || 'N/A', 100, yPos + 4.5)
      
      doc.setTextColor(0, 128, 0)
      doc.text(`NGN ${Number(order.totalAmount || 0).toLocaleString()}`, 130, yPos + 4.5)
      
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }), 165, yPos + 4.5)
      
      yPos += 7
    })
    
  } else if (type === 'products') {
    // Summary Box
    const activeProducts = data.filter(p => p.isActive).length
    const totalStock = data.reduce((sum, p) => sum + (p.totalStock || 0), 0)
    const avgPrice = data.length > 0 ? data.reduce((sum, p) => sum + Number(p.price || 0), 0) / data.length : 0
    
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('Products Summary', 20, yPos + 10)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Products: ${data.length}`, 25, yPos + 18)
    doc.text(`Active: ${activeProducts} | Inactive: ${data.length - activeProducts}`, 25, yPos + 24)
    doc.text(`Active Products: ${activeProducts} of ${data.length}`, 25, yPos + 18)
    doc.text(`Total Stock: ${totalStock.toLocaleString()} units`, 25, yPos + 24)
    doc.text(`Avg Price: NGN ${avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, yPos + 24)
    
    yPos += 38
    
    // Table Header
    doc.setFillColor(240, 140, 23)
    doc.rect(15, yPos, pageWidth - 30, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Product Name', 18, yPos + 5.5)
    doc.text('SKU', 80, yPos + 5.5)
    doc.text('Price', 115, yPos + 5.5)
    doc.text('Stock', 145, yPos + 5.5)
    doc.text('Merchant', 165, yPos + 5.5)
    
    yPos += 8
    
    // Product rows
    data.forEach((product, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        
        doc.setFillColor(240, 140, 23)
        doc.rect(0, 0, pageWidth, 20, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.text(`SJFulfillment - Products Export (cont.)`, pageWidth / 2, 12, { align: 'center' })
        
        yPos = 30
        
        doc.setFillColor(240, 140, 23)
        doc.rect(15, yPos, pageWidth - 30, 8, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Product Name', 18, yPos + 5.5)
        doc.text('SKU', 80, yPos + 5.5)
        doc.text('Price', 115, yPos + 5.5)
        doc.text('Stock', 145, yPos + 5.5)
        doc.text('Merchant', 165, yPos + 5.5)
        yPos += 8
      }
      
      const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(15, yPos, pageWidth - 30, 7, 'F')
      
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text((product.name || 'Unnamed').toString().substring(0, 25), 18, yPos + 4.5)
      doc.text((product.sku || 'N/A').toString().substring(0, 12), 80, yPos + 4.5)
      
      doc.setTextColor(0, 128, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`NGN ${Number(product.price || 0).toLocaleString()}`, 115, yPos + 4.5)
      
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      const stockColor = (product.totalStock || 0) > 10 ? [34, 197, 94] : (product.totalStock || 0) > 0 ? [251, 191, 36] : [239, 68, 68]
      doc.setTextColor(stockColor[0], stockColor[1], stockColor[2])
      doc.text(`${product.totalStock || 0}`, 145, yPos + 4.5)
      
      doc.setTextColor(100, 100, 100)
      doc.text((product.merchantName || 'N/A').toString().substring(0, 15), 165, yPos + 4.5)
      
      yPos += 7
    })
    
  } else if (type === 'returns') {
    // Summary
    const totalRefunds = data.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0)
    const statusCounts: any = {}
    data.forEach(ret => {
      statusCounts[ret.status] = (statusCounts[ret.status] || 0) + 1
    })
    
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('Returns Summary', 20, yPos + 10)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Returns: ${data.length}`, 25, yPos + 18)
    doc.text(`Total Refunds: NGN ${totalRefunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, yPos + 24)
    doc.text(`Approved: ${statusCounts.APPROVED || 0} | Pending: ${statusCounts.PENDING || 0}`, 120, yPos + 18)
    doc.text(`Processed: ${statusCounts.PROCESSED || 0} | Rejected: ${statusCounts.REJECTED || 0}`, 120, yPos + 24)
    
    yPos += 38
    
    // Table Header
    doc.setFillColor(240, 140, 23)
    doc.rect(15, yPos, pageWidth - 30, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Order #', 18, yPos + 5.5)
    doc.text('Reason', 55, yPos + 5.5)
    doc.text('Status', 110, yPos + 5.5)
    doc.text('Refund', 140, yPos + 5.5)
    doc.text('Date', 170, yPos + 5.5)
    
    yPos += 8
    
    // Return rows
    data.forEach((ret, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        doc.setFillColor(240, 140, 23)
        doc.rect(0, 0, pageWidth, 20, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.text(`SJFulfillment - Returns Export (cont.)`, pageWidth / 2, 12, { align: 'center' })
        yPos = 30
      }
      
      const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(15, yPos, pageWidth - 30, 7, 'F')
      
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text((ret.orderNumber || ret.orderId || 'N/A').toString().substring(0, 12), 18, yPos + 4.5)
      doc.text((ret.reason || 'N/A').toString().substring(0, 20), 55, yPos + 4.5)
      
      const statusColor = ret.status === 'APPROVED' ? [34, 197, 94] : 
                         ret.status === 'PENDING' ? [251, 191, 36] : 
                         ret.status === 'REJECTED' ? [239, 68, 68] : [100, 100, 100]
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.setFont('helvetica', 'bold')
      doc.text(ret.status || 'N/A', 110, yPos + 4.5)
      
      doc.setTextColor(0, 128, 0)
      doc.text(`NGN ${Number(ret.refundAmount || 0).toLocaleString()}`, 140, yPos + 4.5)
      
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(ret.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 170, yPos + 4.5)
      
      yPos += 7
    })
  } else {
    // Generic format for other types
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text(`📋 ${type.toUpperCase()} Records`, 20, yPos)
    yPos += 10
    
    data.slice(0, 100).forEach((item, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        doc.setFillColor(240, 140, 23)
        doc.rect(0, 0, pageWidth, 20, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.text(`SJFulfillment - ${type} Export (cont.)`, pageWidth / 2, 12, { align: 'center' })
        yPos = 30
      }
      
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`Record ${index + 1}:`, 20, yPos)
      yPos += 5
      
      const entries = Object.entries(item).slice(0, 5)
      doc.setFont('helvetica', 'normal')
      entries.forEach(([key, value]) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`  ${key}: ${String(value).substring(0, 60)}`, 22, yPos)
        yPos += 4
      })
      yPos += 3
    })
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text('SJFulfillment © 2025 - Powered by Advanced Technology', pageWidth / 2, pageHeight - 8, { align: 'center' })
    doc.text(`Page ${i} of ${pageCount} | Confidential Document`, pageWidth / 2, pageHeight - 4, { align: 'center' })
  }
  
  const buffer = Buffer.from(doc.output('arraybuffer'))
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`
    }
  })
}

async function generateCSVFile(data: any[], filename: string, type: string): Promise<NextResponse> {
  if (data.length === 0) {
    return new NextResponse('No data available', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`
      }
    })
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`
    }
  })
}

