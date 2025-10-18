import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import ProductModal from '@/app/components/product-modal'

// Mock the useApi hook
jest.mock('@/app/lib/use-api', () => ({
  useApi: () => ({
    post: jest.fn(),
    put: jest.fn(),
    loading: false
  })
}))

// Mock the useAuth hook
jest.mock('@/app/lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      role: 'MERCHANT_ADMIN',
      merchantId: 'merchant-1'
    }
  })
}))

describe('ProductModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders add product modal when no product is provided', () => {
    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Add New Product')).toBeInTheDocument()
    expect(screen.getByLabelText('Product Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Unit Price *')).toBeInTheDocument()
  })

  it('renders edit product modal when product is provided', () => {
    const mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      sku: 'TEST-001',
      description: 'Test Description',
      category: 'Electronics',
      unitPrice: 100,
      weight: 1.5,
      dimensions: { length: 10, width: 5, height: 2 },
      isActive: true,
      images: ['image1.jpg', 'image2.jpg']
    }

    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={mockProduct}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Edit Product')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('validates required fields', async () => {
    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const { useApi } = require('@/app/lib/use-api')
    const mockPost = jest.fn().mockResolvedValue({})
    useApi.mockReturnValue({
      post: mockPost,
      put: jest.fn(),
      loading: false
    })

    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Product Name *'), {
      target: { value: 'Test Product' }
    })
    fireEvent.change(screen.getByLabelText('SKU *'), {
      target: { value: 'TEST-001' }
    })
    fireEvent.change(screen.getByLabelText('Unit Price *'), {
      target: { value: '100' }
    })

    const submitButton = screen.getByRole('button', { name: /create product/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/products', expect.objectContaining({
        name: 'Test Product',
        sku: 'TEST-001',
        unitPrice: 100
      }))
    })
  })

  it('handles image upload', async () => {
    const { useApi } = require('@/app/lib/use-api')
    const mockPost = jest.fn().mockResolvedValue({ url: '/uploads/test.jpg' })
    useApi.mockReturnValue({
      post: mockPost,
      put: jest.fn(),
      loading: false
    })

    render(
      <ProductModal
        isOpen={true}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    const fileInput = screen.getByLabelText(/upload images/i)
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/upload/image', expect.any(FormData))
    })
  })

  it('does not render when isOpen is false', () => {
    render(
      <ProductModal
        isOpen={false}
        onClose={mockOnClose}
        product={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.queryByText('Add New Product')).not.toBeInTheDocument()
  })
})

