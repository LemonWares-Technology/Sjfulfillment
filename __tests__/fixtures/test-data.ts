import { faker } from '@faker-js/faker'

// Mock faker for testing
const mockFaker = {
  company: {
    name: () => 'Test Company',
    businessName: () => 'Test Business',
    catchPhrase: () => 'Test catchphrase'
  },
  person: {
    firstName: () => 'John',
    lastName: () => 'Doe',
    fullName: () => 'John Doe',
    email: () => 'john.doe@example.com',
    phoneNumber: () => '+1234567890'
  },
  address: {
    streetAddress: () => '123 Test St',
    city: () => 'Test City',
    state: () => 'Test State',
    zipCode: () => '12345',
    country: () => 'Test Country'
  },
  commerce: {
    productName: () => 'Test Product',
    price: () => 100,
    department: () => 'Electronics'
  },
  string: {
    alphanumeric: (length: number) => 'TEST' + Math.random().toString(36).substr(2, length - 4),
    uuid: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  },
  date: {
    recent: () => new Date(),
    past: () => new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    future: () => new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
  },
  number: {
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    float: (min: number, max: number) => Math.random() * (max - min) + min
  },
  helpers: {
    arrayElement: (array: any[]) => array[Math.floor(Math.random() * array.length)],
    shuffle: (array: any[]) => [...array].sort(() => Math.random() - 0.5)
  }
}

// Mock faker
jest.mock('@faker-js/faker', () => ({
  faker: mockFaker
}))

export const createMockUser = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  email: mockFaker.person.email(),
  firstName: mockFaker.person.firstName(),
  lastName: mockFaker.person.lastName(),
  role: 'MERCHANT_ADMIN',
  merchantId: mockFaker.string.uuid(),
  isActive: true,
  emailVerified: mockFaker.date.recent(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockMerchant = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  businessName: mockFaker.company.businessName(),
  businessType: 'Retail',
  contactEmail: mockFaker.person.email(),
  contactPhone: mockFaker.person.phoneNumber(),
  address: mockFaker.address.streetAddress(),
  city: mockFaker.address.city(),
  state: mockFaker.address.state(),
  zipCode: mockFaker.address.zipCode(),
  country: mockFaker.address.country(),
  taxId: mockFaker.string.alphanumeric(10),
  businessLicense: mockFaker.string.alphanumeric(10),
  status: 'ACTIVE',
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockProduct = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  name: mockFaker.commerce.productName(),
  sku: mockFaker.string.alphanumeric(10),
  description: 'Test product description',
  category: mockFaker.commerce.department(),
  unitPrice: mockFaker.commerce.price(),
  weight: mockFaker.number.float(0.1, 10),
  dimensions: {
    length: mockFaker.number.int(1, 50),
    width: mockFaker.number.int(1, 50),
    height: mockFaker.number.int(1, 50)
  },
  isActive: true,
  images: ['image1.jpg', 'image2.jpg'],
  merchantId: mockFaker.string.uuid(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockOrder = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  orderNumber: 'ORD-' + mockFaker.string.alphanumeric(6),
  status: 'PENDING',
  totalAmount: mockFaker.commerce.price(),
  merchantId: mockFaker.string.uuid(),
  customerId: mockFaker.string.uuid(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockService = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  name: 'Test Service',
  description: 'Test service description',
  dailyPrice: mockFaker.number.int(5, 50),
  features: ['Feature 1', 'Feature 2'],
  isActive: true,
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockLogisticsPartner = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  companyName: mockFaker.company.name(),
  contactEmail: mockFaker.person.email(),
  contactPhone: mockFaker.person.phoneNumber(),
  address: mockFaker.address.streetAddress(),
  coverageAreas: ['Area 1', 'Area 2'],
  status: 'APPROVED',
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockCustomer = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  name: mockFaker.person.fullName(),
  email: mockFaker.person.email(),
  phone: mockFaker.person.phoneNumber(),
  address: {
    street: mockFaker.address.streetAddress(),
    city: mockFaker.address.city(),
    state: mockFaker.address.state(),
    zipCode: mockFaker.address.zipCode(),
    country: mockFaker.address.country()
  },
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockWarehouse = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  name: 'Test Warehouse',
  address: mockFaker.address.streetAddress(),
  city: mockFaker.address.city(),
  state: mockFaker.address.state(),
  zipCode: mockFaker.address.zipCode(),
  country: mockFaker.address.country(),
  capacity: mockFaker.number.int(1000, 10000),
  isActive: true,
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockOrderItem = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  orderId: mockFaker.string.uuid(),
  productId: mockFaker.string.uuid(),
  quantity: mockFaker.number.int(1, 10),
  unitPrice: mockFaker.commerce.price(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockBillingRecord = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  merchantId: mockFaker.string.uuid(),
  amount: mockFaker.number.int(10, 100),
  type: 'DAILY_SERVICE_FEE',
  description: 'Daily service fee',
  status: 'PENDING',
  dueDate: mockFaker.date.future(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

export const createMockMerchantServiceSubscription = (overrides = {}) => ({
  id: mockFaker.string.uuid(),
  merchantId: mockFaker.string.uuid(),
  serviceId: mockFaker.string.uuid(),
  isActive: true,
  startDate: mockFaker.date.past(),
  endDate: mockFaker.date.future(),
  createdAt: mockFaker.date.past(),
  updatedAt: mockFaker.date.recent(),
  ...overrides
})

// Helper function to create arrays of mock data
export const createMockArray = <T>(createFn: () => T, count: number): T[] => {
  return Array.from({ length: count }, createFn)
}

// Helper function to create paginated mock data
export const createMockPaginatedData = <T>(
  createFn: () => T,
  count: number,
  page = 1,
  limit = 10
) => {
  const items = createMockArray(createFn, count)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedItems = items.slice(startIndex, endIndex)

  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  }
}

// Export all mock data creators
export const mockData = {
  user: createMockUser,
  merchant: createMockMerchant,
  product: createMockProduct,
  order: createMockOrder,
  service: createMockService,
  logisticsPartner: createMockLogisticsPartner,
  customer: createMockCustomer,
  warehouse: createMockWarehouse,
  orderItem: createMockOrderItem,
  billingRecord: createMockBillingRecord,
  merchantServiceSubscription: createMockMerchantServiceSubscription,
  array: createMockArray,
  paginated: createMockPaginatedData
}

