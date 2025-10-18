import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import LogisticsPartnerModal from '@/app/components/logistics-partner-modal'

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
      role: 'SJFS_ADMIN'
    }
  })
}))

describe('LogisticsPartnerModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders add partner modal when no partner is provided', () => {
    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Add New Logistics Partner')).toBeInTheDocument()
    expect(screen.getByLabelText('Company Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Email *')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Phone *')).toBeInTheDocument()
    expect(screen.getByLabelText('Password *')).toBeInTheDocument()
  })

  it('renders edit partner modal when partner is provided', () => {
    const mockPartner = {
      id: 'partner-1',
      companyName: 'Test Logistics',
      contactEmail: 'test@logistics.com',
      contactPhone: '+1234567890',
      address: '123 Test St',
      coverageAreas: ['Area 1', 'Area 2'],
      status: 'APPROVED'
    }

    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={mockPartner}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Edit Logistics Partner')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Logistics')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@logistics.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('validates required fields', async () => {
    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create partner/i })
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
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'Test Logistics' }
    })
    fireEvent.change(screen.getByLabelText('Contact Email *'), {
      target: { value: 'test@logistics.com' }
    })
    fireEvent.change(screen.getByLabelText('Contact Phone *'), {
      target: { value: '+1234567890' }
    })
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'password123' }
    })

    const submitButton = screen.getByRole('button', { name: /create partner/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/logistics-partners', expect.objectContaining({
        companyName: 'Test Logistics',
        contactEmail: 'test@logistics.com',
        contactPhone: '+1234567890',
        password: 'password123'
      }))
    })
  })

  it('adds coverage area when add button is clicked', () => {
    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    const areaInput = screen.getByPlaceholderText('Enter coverage area')
    const addButton = screen.getByRole('button', { name: /add area/i })

    fireEvent.change(areaInput, { target: { value: 'New Area' } })
    fireEvent.click(addButton)

    expect(screen.getByText('New Area')).toBeInTheDocument()
  })

  it('removes coverage area when remove button is clicked', () => {
    const mockPartner = {
      id: 'partner-1',
      companyName: 'Test Logistics',
      contactEmail: 'test@logistics.com',
      contactPhone: '+1234567890',
      coverageAreas: ['Area 1', 'Area 2']
    }

    render(
      <LogisticsPartnerModal
        isOpen={true}
        onClose={mockOnClose}
        partner={mockPartner}
        onSave={mockOnSave}
      />
    )

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])

    expect(screen.queryByText('Area 1')).not.toBeInTheDocument()
    expect(screen.getByText('Area 2')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <LogisticsPartnerModal
        isOpen={false}
        onClose={mockOnClose}
        partner={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.queryByText('Add New Logistics Partner')).not.toBeInTheDocument()
  })
})

