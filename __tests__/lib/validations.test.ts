import { z } from 'zod'
import {
  createProductSchema,
  createOrderSchema,
  createLogisticsPartnerSchema,
  createMerchantSchema,
  createUserSchema
} from '@/app/lib/validations'

describe('Validation Schemas', () => {
  describe('createProductSchema', () => {
    it('validates valid product data', () => {
      const validProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        description: 'Test Description',
        category: 'Electronics',
        unitPrice: 100,
        weight: 1.5,
        dimensions: {
          length: 10,
          width: 5,
          height: 2
        },
        isActive: true,
        images: ['image1.jpg', 'image2.jpg']
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('rejects product without required fields', () => {
      const invalidProduct = {
        name: 'Test Product'
        // Missing required fields: sku, unitPrice
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2) // sku and unitPrice missing
      }
    })

    it('rejects negative unit price', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        unitPrice: -10
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('greater than 0')
      }
    })

    it('rejects invalid SKU format', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'invalid sku with spaces',
        unitPrice: 100
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('alphanumeric')
      }
    })
  })

  describe('createOrderSchema', () => {
    it('validates valid order data', () => {
      const validOrder = {
        customerId: 'customer-1',
        orderItems: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      }

      const result = createOrderSchema.safeParse(validOrder)
      expect(result.success).toBe(true)
    })

    it('rejects order without customer', () => {
      const invalidOrder = {
        orderItems: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50
          }
        ]
      }

      const result = createOrderSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required')
      }
    })

    it('rejects order without items', () => {
      const invalidOrder = {
        customerId: 'customer-1',
        orderItems: []
      }

      const result = createOrderSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 1')
      }
    })

    it('rejects order item with invalid quantity', () => {
      const invalidOrder = {
        customerId: 'customer-1',
        orderItems: [
          {
            productId: 'product-1',
            quantity: 0,
            unitPrice: 50
          }
        ]
      }

      const result = createOrderSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('greater than 0')
      }
    })
  })

  describe('createLogisticsPartnerSchema', () => {
    it('validates valid logistics partner data', () => {
      const validPartner = {
        companyName: 'Test Logistics',
        contactEmail: 'test@logistics.com',
        contactPhone: '+1234567890',
        address: '123 Test St',
        coverageAreas: ['Area 1', 'Area 2'],
        password: 'password123'
      }

      const result = createLogisticsPartnerSchema.safeParse(validPartner)
      expect(result.success).toBe(true)
    })

    it('rejects partner without required fields', () => {
      const invalidPartner = {
        companyName: 'Test Logistics'
        // Missing required fields
      }

      const result = createLogisticsPartnerSchema.safeParse(invalidPartner)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('rejects invalid email format', () => {
      const invalidPartner = {
        companyName: 'Test Logistics',
        contactEmail: 'invalid-email',
        contactPhone: '+1234567890',
        password: 'password123'
      }

      const result = createLogisticsPartnerSchema.safeParse(invalidPartner)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('email')
      }
    })

    it('rejects weak password', () => {
      const invalidPartner = {
        companyName: 'Test Logistics',
        contactEmail: 'test@logistics.com',
        contactPhone: '+1234567890',
        password: '123'
      }

      const result = createLogisticsPartnerSchema.safeParse(invalidPartner)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 6')
      }
    })
  })

  describe('createMerchantSchema', () => {
    it('validates valid merchant data', () => {
      const validMerchant = {
        businessName: 'Test Business',
        businessType: 'Retail',
        contactEmail: 'test@business.com',
        contactPhone: '+1234567890',
        address: '123 Business St',
        city: 'Business City',
        state: 'Business State',
        zipCode: '12345',
        country: 'Business Country',
        taxId: 'TAX123456',
        businessLicense: 'LIC123456'
      }

      const result = createMerchantSchema.safeParse(validMerchant)
      expect(result.success).toBe(true)
    })

    it('rejects merchant without business name', () => {
      const invalidMerchant = {
        businessType: 'Retail',
        contactEmail: 'test@business.com'
      }

      const result = createMerchantSchema.safeParse(invalidMerchant)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required')
      }
    })
  })

  describe('createUserSchema', () => {
    it('validates valid user data', () => {
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'MERCHANT_STAFF',
        password: 'password123'
      }

      const result = createUserSchema.safeParse(validUser)
      expect(result.success).toBe(true)
    })

    it('rejects user without required fields', () => {
      const invalidUser = {
        firstName: 'John'
        // Missing required fields
      }

      const result = createUserSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('rejects invalid role', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'INVALID_ROLE',
        password: 'password123'
      }

      const result = createUserSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('enum')
      }
    })
  })
})

