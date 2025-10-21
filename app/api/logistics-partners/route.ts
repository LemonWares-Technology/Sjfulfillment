import { NextRequest } from 'next/server'
import { JWTPayload } from '@/app/lib/auth'
import { createErrorResponse, createResponse, withRole } from '@/app/lib/api-utils'
import { prisma } from '@/app/lib/prisma'
import { createLogisticsPartnerSchema } from '@/app/lib/validations'
import { hashPassword } from '@/app/lib/password'
import { sendWelcomePartnerEmail } from '@/app/lib/email'

// GET /api/logistics-partners
export const GET = withRole(['SJFS_ADMIN', 'WAREHOUSE_STAFF', 'MERCHANT_ADMIN', 'MERCHANT_STAFF'], async (request: NextRequest, user: JWTPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const serviceType = searchParams.get('serviceType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (city) where.city = city
    if (state) where.state = state
    if (serviceType) where.serviceType = serviceType
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const skip = (page - 1) * limit

    const [partners, total] = await Promise.all([
      prisma.logisticsPartner.findMany({
        where,
        skip,
        take: limit,
        include: {
          deliveryMetrics: {
            select: {
              id: true,
              deliveryStatus: true,
              deliveryTime: true,
              deliveryAttempts: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          _count: {
            select: {
              deliveryMetrics: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.logisticsPartner.count({ where })
    ])

    // Transform data to match frontend expectations
    const transformedPartners = partners.map(partner => ({
      id: partner.id,
      name: partner.companyName,
      contactPerson: partner.contactPerson,
      email: partner.email,
      phone: partner.phone,
      address: partner.address,
      city: partner.city,
      state: partner.state,
      country: 'Nigeria',
      serviceType: 'STANDARD',
      coverageArea: [],
      isActive: partner.status === 'APPROVED',
      createdAt: partner.createdAt.toISOString(),
      deliveryMetrics: partner.deliveryMetrics.map(metric => ({
        id: metric.id,
        averageDeliveryTime: metric.deliveryTime || 0,
        onTimeDeliveryRate: 85, // Default value, should be calculated
        totalDeliveries: partner._count.deliveryMetrics
      }))
    }))

    return createResponse(
      {
        partners: transformedPartners,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      200,
      'Logistics partners retrieved successfully'
    )
  } catch (error) {
    console.error('Get logistics partners error:', error)
    return createErrorResponse('Failed to retrieve logistics partners', 500)
  }
})

// POST /api/logistics-partners
export const POST = withRole(['SJFS_ADMIN'], async (request: NextRequest, user: JWTPayload) => {
  try {
    console.log('Creating logistics partner for user:', user.role, user.userId)
    const body = await request.json()
    console.log('Request body:', body)
    const partnerData = createLogisticsPartnerSchema.parse(body)
    console.log('Parsed partner data:', partnerData)

    // Check if partner with same email already exists
    const existingPartner = await prisma.logisticsPartner.findUnique({
      where: { email: partnerData.email }
    })

    if (existingPartner) {
      return createErrorResponse('Logistics partner with this email already exists', 400)
    }

    // Check if user with same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: partnerData.email }
    })

    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(partnerData.password)

    // Extract password from partner data (not part of LogisticsPartner model)
    const { password, ...partnerDataWithoutPassword } = partnerData

    // Create logistics partner and user account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create logistics partner
      const newPartner = await tx.logisticsPartner.create({
        data: {
          ...partnerDataWithoutPassword,
        },
        include: {
          deliveryMetrics: {
            select: {
              id: true,
              deliveryStatus: true,
              deliveryTime: true
            },
            take: 5
          }
        }
      })

      // Create user account for logistics partner
      const newUser = await tx.user.create({
        data: {
          email: partnerData.email,
          phone: partnerData.phone,
          firstName: partnerData.contactPerson.split(' ')[0] || partnerData.contactPerson,
          lastName: partnerData.contactPerson.split(' ').slice(1).join(' ') || '',
          password: hashedPassword,
          role: 'WAREHOUSE_STAFF', // Logistics partners are warehouse staff
          isActive: true,
          emailVerified: new Date() // Auto-verify for admin-created users
        }
      })

      return { newPartner, newUser }
    }, {
      timeout: 10000 // Increase timeout to 10 seconds
    })

  const { newPartner } = result

    // Log the creation
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: user.userId } },
        action: 'CREATE_LOGISTICS_PARTNER',
        entityType: 'logistics_partners',
        entityId: newPartner.id,
        newValues: partnerData
      }
    })

    // Send welcome email asynchronously with login credentials
    sendWelcomePartnerEmail({
      to: partnerData.email,
      partnerName: partnerData.contactPerson,
      companyName: partnerData.companyName,
      email: partnerData.email,
      password: partnerData.password
    }).catch((err) => console.error('Failed to send partner welcome email:', err))

    return createResponse(
      newPartner,
      201,
      'Logistics partner created successfully'
    )
  } catch (error) {
    console.error('Create logistics partner error:', error)
    if (error instanceof Error && error.message.includes('validation')) {
      return createErrorResponse('Invalid input data', 400)
    }
    return createErrorResponse('Failed to create logistics partner', 500)
  }
})
