import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/products/route'
import { prisma } from '@/app/lib/prisma'

// Mock Prisma
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    merchant: {
      findUnique: jest.fn()
    }
  }
}))

// Mock auth
jest.mock('@/app/lib/auth', () => ({
  getServerSession: jest.fn()
}))

describe('/api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns products for authenticated merchant', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Product',
          sku: 'TEST-001',
          unitPrice: 100,
          isActive: true,
          merchant: {
            id: 'merchant-1',
            businessName: 'Test Merchant'
          }
        }
      ]

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.product.findMany.mockResolvedValue(mockProducts)

      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProducts)
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1' },
        include: { merchant: true },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('returns all products for SJFS_ADMIN', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'SJFS_ADMIN'
        }
      }

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Product',
          sku: 'TEST-001',
          unitPrice: 100,
          isActive: true,
          merchant: {
            id: 'merchant-1',
            businessName: 'Test Merchant'
          }
        }
      ]

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.product.findMany.mockResolvedValue(mockProducts)

      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProducts)
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        include: { merchant: true },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('returns 401 for unauthenticated user', async () => {
      require('@/app/lib/auth').getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('handles database errors', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch products')
    })
  })

  describe('POST', () => {
    it('creates a new product for authenticated merchant', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'TEST-001',
        unitPrice: 100,
        merchantId: 'merchant-1'
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' })
      prisma.product.create.mockResolvedValue(mockProduct)

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          unitPrice: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProduct)
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Product',
          sku: 'TEST-001',
          unitPrice: 100,
          merchantId: 'merchant-1'
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

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product'
          // Missing required fields
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Required fields missing')
    })

    it('handles duplicate SKU', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'MERCHANT_ADMIN',
          merchantId: 'merchant-1'
        }
      }

      require('@/app/lib/auth').getServerSession.mockResolvedValue(mockSession)
      prisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' })
      prisma.product.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['merchantId', 'sku'] }
      })

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          sku: 'TEST-001',
          unitPrice: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Product with this SKU already exists')
    })
  })
})

