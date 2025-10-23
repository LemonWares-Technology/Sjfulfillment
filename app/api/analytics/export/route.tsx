import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import jsPDF from 'jspdf'
import { logoBase64 } from '@/app/lib/logo-base64'


// GET /api/analytics/export
export const GET = withRole(['SJFS_ADMIN', 'MERCHANT_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]
    const format = searchParams.get('format') || 'pdf'
    const type = searchParams.get('type') || 'general'

    // Get orders data
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z')
        },
        ...(user.role !== 'SJFS_ADMIN' && { merchantId: user.merchantId })
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get products data
    const products = await prisma.product.findMany({
      where: {
        ...(user.role !== 'SJFS_ADMIN' && { merchantId: user.merchantId })
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (format === 'pdf') {
      const pdfBuffer = await generateAnalyticsPdf(orders, products, startDate, endDate)
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="analytics-report-${startDate}-to-${endDate}.pdf"`
        }
      })
    }

    return createErrorResponse('Unsupported format', 400)

  } catch (error) {
    console.error('Error generating analytics export:', error)
    return createErrorResponse('Error generating analytics export', 500)
  }
})

async function generateAnalyticsPdf(orders: any[], products: any[], startDate: string, endDate: string) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // HEADER
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, pageWidth, 35, 'F')

    // Add logo instead of text
    try {
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 8, 40, 18)
      } else {
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
    doc.text('Analytics Report', pageWidth / 2, 32, { align: 'center' })
    
    // Report Info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`Period: ${new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 20, 45)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`, 20, 50)
    
    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    const activeProducts = products.filter(p => p.isActive).length
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0
    const ordersByStatus = {
      PENDING: orders.filter(o => o.status === 'PENDING').length,
      PROCESSING: orders.filter(o => o.status === 'PROCESSING').length,
      SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
      DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,
      CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
      RETURNED: orders.filter(o => o.status === 'RETURNED').length
    }
    
    let yPos = 60
    
    // SUMMARY SECTION
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('KEY METRICS SUMMARY', 20, yPos + 10)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    // Metrics in grid
    const metricY = yPos + 20
    doc.text('Total Orders:', 25, metricY)
    doc.setFont('helvetica', 'bold')
    doc.text(`${orders.length}`, 70, metricY)
    
    doc.setFont('helvetica', 'normal')
    doc.text('Total Revenue:', 110, metricY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 128, 0)
    doc.text(`NGN ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 155, metricY)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Avg Order Value:', 25, metricY + 10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 128)
    doc.text(`NGN ${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 70, metricY + 10)
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Active Products:', 110, metricY + 10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${activeProducts} / ${products.length}`, 155, metricY + 10)
    
    doc.setFont('helvetica', 'normal')
    doc.text('Total Products:', 25, metricY + 20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${products.length}`, 70, metricY + 20)
    
    doc.setFont('helvetica', 'normal')
    doc.text('Delivery Rate:', 110, metricY + 20)
    doc.setFont('helvetica', 'bold')
    const deliveryRate = orders.length > 0 ? ((ordersByStatus.DELIVERED / orders.length) * 100).toFixed(1) : '0.0'
    doc.setTextColor(34, 197, 94)
    doc.text(`${deliveryRate}%`, 155, metricY + 20)
    
    yPos += 60
    
    // ORDER STATUS BREAKDOWN
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('ORDER STATUS DISTRIBUTION', 20, yPos)
    
    yPos += 8
    
    const statusColors: any = {
      PENDING: [251, 191, 36],
      PROCESSING: [59, 130, 246],
      SHIPPED: [147, 51, 234],
      DELIVERED: [34, 197, 94],
      CANCELLED: [239, 68, 68],
      RETURNED: [249, 115, 22]
    }
    
    const statusLabels: any = {
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      RETURNED: 'Returned'
    }
    
    Object.entries(ordersByStatus).forEach(([status, count]: [string, any], index) => {
      const itemY = yPos + (index * 8)
      const color = statusColors[status]
      const percentage = orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : '0.0'
      
      doc.setFillColor(color[0], color[1], color[2])
      doc.circle(25, itemY + 2, 1.5, 'F')
      
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text(statusLabels[status], 30, itemY + 3)
      
      doc.setFont('helvetica', 'bold')
      doc.text(`${count}`, 70, itemY + 3)
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`(${percentage}%)`, 85, itemY + 3)
      
      // Status bar
      const barWidth = 70
      const barHeight = 4
      const barX = 110
      doc.setFillColor(230, 230, 230)
      doc.roundedRect(barX, itemY, barWidth, barHeight, 1, 1, 'F')
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(barX, itemY, (barWidth * Number(percentage)) / 100, barHeight, 1, 1, 'F')
    })
    
    yPos += 55
    
    // TOP ORDERS TABLE
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('TOP 15 ORDERS BY VALUE', 20, yPos)
    
    yPos += 8
    
    // Table Header
    doc.setFillColor(240, 140, 23)
    doc.rect(20, yPos, pageWidth - 40, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Order #', 23, yPos + 5)
    doc.text('Customer', 60, yPos + 5)
    doc.text('Status', 115, yPos + 5)
    doc.text('Amount', 145, yPos + 5)
    doc.text('Date', 175, yPos + 5)
    
    yPos += 8
    
    // Sort and display top orders
    const topOrders = [...orders]
      .sort((a, b) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0))
      .slice(0, 15)
    
    topOrders.forEach((order, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        
        // Header on new page
        doc.setFillColor(240, 140, 23)
        doc.rect(0, 0, pageWidth, 20, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('SJFulfillment - Analytics Report (Continued)', pageWidth / 2, 12, { align: 'center' })
        
        yPos = 30
      }
      
      const rowColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255]
      doc.setFillColor(rowColor[0], rowColor[1], rowColor[2])
      doc.rect(20, yPos, pageWidth - 40, 7, 'F')
      
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text((order.orderNumber || order.id || 'N/A').toString().substring(0, 15), 23, yPos + 5)
      doc.text((order.customerName || 'Unknown').toString().substring(0, 20), 60, yPos + 5)
      
      // Status badge
      const statusColor = statusColors[order.status] || [128, 128, 128]
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.setFont('helvetica', 'bold')
      doc.text(order.status || 'N/A', 115, yPos + 5)
      
      doc.setTextColor(0, 128, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`NGN ${Number(order.totalAmount || 0).toLocaleString()}`, 145, yPos + 5)
      
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 175, yPos + 5)
      
      yPos += 7
    })
    
    // Footer on each page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text('SJFulfillment © 2025 - Analytics Report', pageWidth / 2, pageHeight - 8, { align: 'center' })
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 4, { align: 'center' })
    }
    
    return Buffer.from(doc.output('arraybuffer'))
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}