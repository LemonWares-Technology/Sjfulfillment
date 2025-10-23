import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import jsPDF from 'jspdf'
import { logoBase64 } from '@/app/lib/logo-base64'

// GET /api/analytics/comprehensive-report
export const GET = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('end') || new Date().toISOString()
    const format = searchParams.get('format') || 'pdf'

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Get comprehensive data
    const [
      merchants,
      orders,
      products,
      customers,
      logisticsPartners,
      subscriptions,
      serviceSubscriptions
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end }
        }
      }),
      prisma.product.count(),
      prisma.order.groupBy({
        by: ['customerEmail'],
        where: {
          customerEmail: { not: null }
        }
      }).then(result => result.length),
      prisma.logisticsPartner.count(),
      prisma.service.count(),
      prisma.merchantServiceSubscription.count()
    ])

    const totalMerchants = merchants
    const totalOrders = orders.length
    const totalRevenueAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const totalProducts = products
    const totalCustomers = customers
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length
    const pendingOrders = orders.filter(o => ['PENDING', 'PROCESSING'].includes(o.status)).length
    const returnedOrders = orders.filter(o => o.status === 'RETURNED').length

    // Generate comprehensive report
    if (format === 'pdf') {
      const pdfBuffer = await generateComprehensivePdf(
        totalMerchants, totalOrders, totalRevenueAmount, totalProducts, totalCustomers,
        [merchants], orders, [products], [customers], [logisticsPartners], [subscriptions], [serviceSubscriptions],
        deliveredOrders, pendingOrders, returnedOrders, startDate, endDate
      )
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="sjf-comprehensive-report-${startDate.split('T')[0]}-to-${endDate.split('T')[0]}.pdf"`
        }
      })
    }

    return createErrorResponse('Unsupported format', 400)

  } catch (error) {
    console.error('Comprehensive report error:', error)
    return createErrorResponse('Failed to generate comprehensive report', 500)
  }
})

async function generateComprehensivePdf(
  totalMerchants: number, totalOrders: number, totalRevenueAmount: number, totalProducts: number, totalCustomers: number,
  merchants: any[], orders: any[], products: any[], customers: any[], logisticsPartners: any[], subscriptions: any[], serviceSubscriptions: any[],
  deliveredOrders: number, pendingOrders: number, returnedOrders: number, startDate: string, endDate: string
) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // HEADER - Brand Banner
    doc.setFillColor(10, 10, 10) // black header
    doc.rect(0, 0, pageWidth, 40, 'F')

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
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('SJFulfillment', pageWidth / 2, 18, { align: 'center' })
    }
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text('COMPREHENSIVE BUSINESS ANALYTICS REPORT', pageWidth / 2, 32, { align: 'center' })
    
    // Report Metadata
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Report Period: ${new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 52)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, 20, 58)
    doc.text(`Report Type: Admin Comprehensive Analysis`, 20, 64)
    
    // Divider Line
    doc.setDrawColor(240, 140, 23)
    doc.setLineWidth(0.5)
    doc.line(20, 68, pageWidth - 20, 68)
    
    let yPos = 78
    
    // EXECUTIVE SUMMARY SECTION
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, pageWidth - 30, 75, 3, 3, 'F')
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('EXECUTIVE SUMMARY', 20, yPos + 10)
    
    // Key Metrics Grid
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    
    const metricStartY = yPos + 22
    const col1X = 25
    const col2X = 110
    
    // Column 1
    doc.setFillColor(240, 140, 23)
    doc.circle(col1X, metricStartY, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Total Revenue:', col1X + 5, metricStartY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0, 128, 0)
    doc.text(`NGN ${totalRevenueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col1X + 5, metricStartY + 8)
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(240, 140, 23)
    doc.circle(col1X, metricStartY + 20, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Total Orders:', col1X + 5, metricStartY + 20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`${totalOrders.toLocaleString()}`, col1X + 5, metricStartY + 28)
    
    doc.setFontSize(11)
    doc.setFillColor(240, 140, 23)
    doc.circle(col1X, metricStartY + 40, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Registered Merchants:', col1X + 5, metricStartY + 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`${totalMerchants.toLocaleString()}`, col1X + 5, metricStartY + 48)
    
    // Column 2
    doc.setFontSize(11)
    doc.setFillColor(240, 140, 23)
    doc.circle(col2X, metricStartY, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Average Order Value:', col2X + 5, metricStartY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 128)
    doc.text(`NGN ${totalOrders > 0 ? (totalRevenueAmount / totalOrders).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`, col2X + 5, metricStartY + 8)
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(240, 140, 23)
    doc.circle(col2X, metricStartY + 20, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Total Products:', col2X + 5, metricStartY + 20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`${totalProducts.toLocaleString()}`, col2X + 5, metricStartY + 28)
    
    doc.setFontSize(11)
    doc.setFillColor(240, 140, 23)
    doc.circle(col2X, metricStartY + 40, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.text('Unique Customers:', col2X + 5, metricStartY + 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`${totalCustomers.toLocaleString()}`, col2X + 5, metricStartY + 48)
    
    yPos += 85
    
    // ORDER STATUS BREAKDOWN
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('ORDER STATUS BREAKDOWN', 20, yPos)
    
    yPos += 10
    const statusBarWidth = pageWidth - 50
    const statusHeight = 8
    
    // Calculate percentages
    const deliveredPercent = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0
    const pendingPercent = totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0
    const returnedPercent = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0
    const deliveryRate = deliveredPercent.toFixed(1)
    
    // Delivered - Green
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(25, yPos, (statusBarWidth * deliveredPercent / 100), statusHeight, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    if (deliveredPercent > 10) {
      doc.text(`${deliveredOrders} Delivered (${deliveredPercent.toFixed(1)}%)`, 30, yPos + 5.5)
    }
    
    // Pending - Amber
    const pendingX = 25 + (statusBarWidth * deliveredPercent / 100)
    doc.setFillColor(245, 158, 11)
    doc.roundedRect(pendingX, yPos, (statusBarWidth * pendingPercent / 100), statusHeight, 2, 2, 'F')
    if (pendingPercent > 10) {
      doc.text(`${pendingOrders} Pending (${pendingPercent.toFixed(1)}%)`, pendingX + 5, yPos + 5.5)
    }
    
    // Returned - Red
    const returnedX = pendingX + (statusBarWidth * pendingPercent / 100)
    doc.setFillColor(239, 68, 68)
    doc.roundedRect(returnedX, yPos, (statusBarWidth * returnedPercent / 100), statusHeight, 2, 2, 'F')
    if (returnedPercent > 10) {
      doc.text(`${returnedOrders} Returned (${returnedPercent.toFixed(1)}%)`, returnedX + 5, yPos + 5.5)
    }
    
    yPos += 15
    
    // Legend
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(34, 197, 94)
    doc.circle(25, yPos, 1.5, 'F')
    doc.text(`Delivered: ${deliveredOrders} (${deliveredPercent.toFixed(1)}%)`, 30, yPos + 1)
    
    doc.setFillColor(245, 158, 11)
    doc.circle(80, yPos, 1.5, 'F')
    doc.text(`Pending: ${pendingOrders} (${pendingPercent.toFixed(1)}%)`, 85, yPos + 1)
    
    doc.setFillColor(239, 68, 68)
    doc.circle(130, yPos, 1.5, 'F')
    doc.text(`Returned: ${returnedOrders} (${returnedPercent.toFixed(1)}%)`, 135, yPos + 1)
    
    yPos += 15
    
    // KEY PERFORMANCE INDICATORS
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('KEY PERFORMANCE INDICATORS', 20, yPos)
    
    yPos += 8
    
    // KPI Boxes
    const kpiBoxWidth = (pageWidth - 55) / 3
    const kpiBoxHeight = 20
    
    // Delivery Success Rate
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(34, 197, 94)
    doc.setLineWidth(0.5)
    doc.roundedRect(20, yPos, kpiBoxWidth, kpiBoxHeight, 2, 2, 'FD')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Delivery Success Rate', 25, yPos + 8)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94)
    doc.text(`${deliveryRate}%`, 25, yPos + 16)
    
    // Product per Merchant
    const productsPerMerchant = totalMerchants > 0 ? (totalProducts / totalMerchants).toFixed(1) : '0.0'
    doc.setFillColor(254, 243, 199)
    doc.setDrawColor(245, 158, 11)
    doc.roundedRect(25 + kpiBoxWidth, yPos, kpiBoxWidth, kpiBoxHeight, 2, 2, 'FD')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Avg Products/Merchant', 30 + kpiBoxWidth, yPos + 8)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(245, 158, 11)
    doc.text(productsPerMerchant, 30 + kpiBoxWidth, yPos + 16)
    
    // Revenue per Order
    const revenuePerOrder = totalOrders > 0 ? (totalRevenueAmount / totalOrders).toFixed(2) : '0.00'
    doc.setFillColor(239, 246, 255)
    doc.setDrawColor(59, 130, 246)
    doc.roundedRect(30 + (kpiBoxWidth * 2), yPos, kpiBoxWidth, kpiBoxHeight, 2, 2, 'FD')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text('Avg Revenue/Order', 35 + (kpiBoxWidth * 2), yPos + 8)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(59, 130, 246)
    doc.text(`NGN ${Number(revenuePerOrder).toLocaleString()}`, 35 + (kpiBoxWidth * 2), yPos + 16)
    
    // NEW PAGE - Detailed Breakdown
    doc.addPage()
    
    // Header on new page
    doc.setFillColor(240, 140, 23)
    doc.rect(0, 0, pageWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('SJFulfillment - Detailed Analysis', pageWidth / 2, 15, { align: 'center' })
    
    yPos = 35
    
    // MERCHANT ACTIVITY ANALYSIS
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('MERCHANT & OPERATIONS OVERVIEW', 20, yPos)
    
    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    const detailBoxes = [
      { label: 'Total Registered Merchants', value: totalMerchants.toLocaleString(), color: [240, 140, 23] },
      { label: 'Total Product Catalog', value: totalProducts.toLocaleString(), color: [59, 130, 246] },
      { label: 'Unique Customers Served', value: totalCustomers.toLocaleString(), color: [34, 197, 94] },
      { label: 'Logistics Partners', value: logisticsPartners.length.toLocaleString(), color: [168, 85, 247] },
      { label: 'Active Service Subscriptions', value: serviceSubscriptions.length.toLocaleString(), color: [236, 72, 153] },
      { label: 'Available Services', value: subscriptions.length.toLocaleString(), color: [20, 184, 166] }
    ]
    
    detailBoxes.forEach((box, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const boxX = 20 + (col * 95)
      const boxY = yPos + (row * 25)
      
      doc.setDrawColor(box.color[0], box.color[1], box.color[2])
      doc.setLineWidth(0.3)
      doc.roundedRect(boxX, boxY, 90, 20, 2, 2, 'D')
      
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(box.label, boxX + 4, boxY + 8)
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(box.color[0], box.color[1], box.color[2])
      doc.text(box.value, boxX + 4, boxY + 16)
      doc.setFont('helvetica', 'normal')
    })
    
    yPos += 80
    
    // REVENUE INSIGHTS
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('REVENUE & FINANCIAL INSIGHTS', 20, yPos)
    
    yPos += 10
    
    const financialMetrics = [
      { label: 'Total Revenue Generated', value: `NGN ${totalRevenueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Average Order Value', value: `NGN ${revenuePerOrder}` },
      { label: 'Revenue per Merchant', value: `NGN ${totalMerchants > 0 ? (totalRevenueAmount / totalMerchants).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}` },
      { label: 'Revenue per Customer', value: `NGN ${totalCustomers > 0 ? (totalRevenueAmount / totalCustomers).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}` }
    ]
    
    financialMetrics.forEach((metric, index) => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`${metric.label}:`, 25, yPos + (index * 10))
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 128, 0)
      doc.text(metric.value, 120, yPos + (index * 10))
    })
    
    yPos += 50
    
    // OPERATIONAL EFFICIENCY
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(240, 140, 23)
    doc.text('OPERATIONAL EFFICIENCY METRICS', 20, yPos)
    
    yPos += 10
    
    const orderFulfillmentRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0.0'
    const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0.0'
    const processingOrders = totalOrders - deliveredOrders - returnedOrders
    
    const efficiencyMetrics = [
      { label: 'Order Fulfillment Rate', value: `${orderFulfillmentRate}%`, status: Number(orderFulfillmentRate) >= 90 ? 'Excellent' : Number(orderFulfillmentRate) >= 75 ? 'Good' : 'Needs Improvement' },
      { label: 'Return Rate', value: `${returnRate}%`, status: Number(returnRate) <= 5 ? 'Excellent' : Number(returnRate) <= 10 ? 'Acceptable' : 'High' },
      { label: 'Orders In Process', value: `${processingOrders}`, status: 'Active' },
      { label: 'Customer Retention', value: `${totalCustomers} unique`, status: 'Growing' }
    ]
    
    efficiencyMetrics.forEach((metric, index) => {
      const metricY = yPos + (index * 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`${metric.label}:`, 25, metricY)
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(59, 130, 246)
      doc.text(metric.value, 90, metricY)
      
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(metric.status, 130, metricY)
    })
    
    // Footer - Page 2
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('SJFulfillment © 2025 - Enterprise Fulfillment Platform', pageWidth / 2, pageHeight - 15, { align: 'center' })
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text('Page 2 of 2', pageWidth / 2, pageHeight - 5, { align: 'center' })
    
    // Footer - Page 1
    doc.setPage(1)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('SJFulfillment © 2025 - Enterprise Fulfillment Platform', pageWidth / 2, pageHeight - 15, { align: 'center' })
    doc.text(`Confidential Report - Admin Access Only`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text('Page 1 of 2', pageWidth / 2, pageHeight - 5, { align: 'center' })
    
    return Buffer.from(doc.output('arraybuffer'))
  } catch (error) {
    console.error('PDF generation error:', error)
    throw error
  }
}