import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/lib/auth-context'
import { NotificationProvider } from '@/app/lib/notification-context'
import { WebSocketProvider } from '@/app/lib/websocket-context'

// Mock API hook
const mockApiHook = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  loading: false,
  error: null
}

// Mock useApi hook
jest.mock('@/app/lib/use-api', () => ({
  useApi: () => mockApiHook
}))

// Mock WebSocket
const mockWebSocket = {
  isConnected: true,
  lastMessage: null,
  sendMessage: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
}

// Mock useWebSocket hook
jest.mock('@/app/lib/websocket-context', () => ({
  ...jest.requireActual('@/app/lib/websocket-context'),
  useWebSocket: () => mockWebSocket
}))

// Mock notifications
const mockNotifications = {
  notifications: [],
  unreadCount: 0,
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  removeNotification: jest.fn(),
  clearAll: jest.fn()
}

// Mock useNotifications hook
jest.mock('@/app/lib/notification-context', () => ({
  ...jest.requireActual('@/app/lib/notification-context'),
  useNotifications: () => mockNotifications
}))

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'SJFS_ADMIN',
  merchantId: null,
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  emailVerified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}

export const mockMerchantUser = {
  id: 'test-merchant-user-id',
  email: 'merchant@example.com',
  role: 'MERCHANT_ADMIN',
  merchantId: 'test-merchant-id',
  firstName: 'Merchant',
  lastName: 'Admin',
  isActive: true,
  emailVerified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock merchant data
export const mockMerchant = {
  id: 'test-merchant-id',
  businessName: 'Test Business',
  businessType: 'Retail',
  contactEmail: 'merchant@example.com',
  contactPhone: '+1234567890',
  address: '123 Test St',
  city: 'Test City',
  state: 'Test State',
  zipCode: '12345',
  country: 'Test Country',
  taxId: 'TAX123456',
  businessLicense: 'LIC123456',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock product data
export const mockProduct = {
  id: 'test-product-id',
  name: 'Test Product',
  sku: 'TEST-001',
  description: 'Test product description',
  category: 'Electronics',
  unitPrice: 100,
  weight: 1.5,
  dimensions: { length: 10, width: 5, height: 2 },
  isActive: true,
  images: ['image1.jpg', 'image2.jpg'],
  merchantId: 'test-merchant-id',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock order data
export const mockOrder = {
  id: 'test-order-id',
  orderNumber: 'ORD-001',
  status: 'PENDING',
  totalAmount: 100,
  merchantId: 'test-merchant-id',
  customerId: 'test-customer-id',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock service data
export const mockService = {
  id: 'test-service-id',
  name: 'Basic Fulfillment',
  description: 'Basic order fulfillment service',
  dailyPrice: 10,
  features: ['Order processing', 'Inventory management'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock logistics partner data
export const mockLogisticsPartner = {
  id: 'test-partner-id',
  companyName: 'Test Logistics',
  contactEmail: 'test@logistics.com',
  contactPhone: '+1234567890',
  address: '123 Logistics St',
  coverageAreas: ['Area 1', 'Area 2'],
  status: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Helper functions for testing
export const createMockApiResponse = (data: any, success = true) => ({
  success,
  data,
  error: success ? null : 'Test error'
})

export const createMockPaginatedResponse = (items: any[], page = 1, limit = 10) => ({
  success: true,
  data: items,
  pagination: {
    page,
    limit,
    total: items.length,
    totalPages: Math.ceil(items.length / limit)
  }
})

// Mock API responses
export const mockApiResponses = {
  products: createMockPaginatedResponse([mockProduct]),
  orders: createMockPaginatedResponse([mockOrder]),
  merchants: createMockPaginatedResponse([mockMerchant]),
  services: createMockPaginatedResponse([mockService]),
  logisticsPartners: createMockPaginatedResponse([mockLogisticsPartner]),
  user: createMockApiResponse(mockUser),
  merchant: createMockApiResponse(mockMerchant),
  product: createMockApiResponse(mockProduct),
  order: createMockApiResponse(mockOrder),
  service: createMockApiResponse(mockService),
  logisticsPartner: createMockApiResponse(mockLogisticsPartner)
}

// Setup mock API responses
export const setupMockApi = () => {
  mockApiHook.get.mockImplementation((url: string) => {
    if (url.includes('/products')) return Promise.resolve(mockApiResponses.products)
    if (url.includes('/orders')) return Promise.resolve(mockApiResponses.orders)
    if (url.includes('/merchants')) return Promise.resolve(mockApiResponses.merchants)
    if (url.includes('/services')) return Promise.resolve(mockApiResponses.services)
    if (url.includes('/logistics-partners')) return Promise.resolve(mockApiResponses.logisticsPartners)
    return Promise.resolve(createMockApiResponse(null))
  })

  mockApiHook.post.mockImplementation((url: string, data: any) => {
    if (url.includes('/products')) return Promise.resolve(mockApiResponses.product)
    if (url.includes('/orders')) return Promise.resolve(mockApiResponses.order)
    if (url.includes('/merchants')) return Promise.resolve(mockApiResponses.merchant)
    if (url.includes('/services')) return Promise.resolve(mockApiResponses.service)
    if (url.includes('/logistics-partners')) return Promise.resolve(mockApiResponses.logisticsPartner)
    return Promise.resolve(createMockApiResponse(null))
  })

  mockApiHook.put.mockImplementation((url: string, data: any) => {
    return Promise.resolve(createMockApiResponse({ ...data, updatedAt: new Date() }))
  })

  mockApiHook.delete.mockImplementation((url: string) => {
    return Promise.resolve(createMockApiResponse({ success: true }))
  })
}

// Clean up mocks
export const cleanupMocks = () => {
  jest.clearAllMocks()
  mockApiHook.get.mockClear()
  mockApiHook.post.mockClear()
  mockApiHook.put.mockClear()
  mockApiHook.delete.mockClear()
  mockWebSocket.sendMessage.mockClear()
  mockWebSocket.connect.mockClear()
  mockWebSocket.disconnect.mockClear()
  mockNotifications.markAsRead.mockClear()
  mockNotifications.markAllAsRead.mockClear()
  mockNotifications.removeNotification.mockClear()
  mockNotifications.clearAll.mockClear()
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { mockApiHook, mockWebSocket, mockNotifications }

