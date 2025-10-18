import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/orders/route'
import { prisma } from '@/app/lib/prisma'

// Mock Prisma
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    merchant: {
      findUnique: jest.fn()
    },
    customer: {
      findUnique: jest.fn()
    },
    product: {
      findMany: jest.fn()
    }
  }
}))

// Mock auth
jest.mock('@/app/lib/auth', () => ({
  getServerSession: jest.fn()
}))

describe('/api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns orders for authenticated merchant', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'PENDING',
          totalAmount: 100,
          merchant: {
            id: 'merchant-1',
            businessName: 'Test Merchant'
          },
          customer: {
            id: 'customer-1',
            name: 'Test Customer'
          }
        }
      ]

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.order.findMany.mockResolvedValue(mockOrders)

      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrders)
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1' },
        include: {
          merchant: true,
          customer: true,
          orderItems: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('returns all orders for SJFS_ADMIN', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'SJFS_ADMIN'
        }
      }

      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'PENDING',
          totalAmount: 100,
          merchant: {
            id: 'merchant-1',
            businessName: 'Test Merchant'
          }
        }
      ]

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.order.findMany.mockResolvedValue(mockOrders)

      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrders)
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        include: {
          merchant: true,
          customer: true,
          orderItems: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('filters orders by status', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'SJFS_ADMIN'
        }
      }

      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'PENDING',
          totalAmount: 100
        }
      ]

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.order.findMany.mockResolvedValue(mockOrders)

      const request = new NextRequest('http://localhost:3000/api/orders?status=PENDING')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: {
          merchant: true,
          customer: true,
          orderItems: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('returns 401 for unauthenticated user', async () => {
      require('@/app/lib/auth').getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    it('creates a new order for authenticated merchant', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'PENDING',
        totalAmount: 100,
        merchantId: 'merchant-1'
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' })
      prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' })
      prisma.product.findMany.mockResolvedValue([
        { id: 'product-1', name: 'Test Product', unitPrice: 50 }
      ])
      prisma.order.create.mockResolvedValue(mockOrder)

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'customer-1',
          orderItems: [
            {
              productId: 'product-1',
              quantity: 2,
              unitPrice: 50
            }
          ]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrder)
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          merchantId: 'merchant-1',
          customerId: 'customer-1',
          totalAmount: 100
        })
      })
    })

    it('validates required fields', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'customer-1'
          // Missing orderItems
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Order items are required')
    })

    it('handles invalid customer', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' })
      prisma.customer.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'invalid-customer',
          orderItems: [
            {
              productId: 'product-1',
              quantity: 2,
              unitPrice: 50
            }
          ]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Customer not found')
    })
  })
})

