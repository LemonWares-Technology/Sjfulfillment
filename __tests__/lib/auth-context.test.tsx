import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AuthProvider, useAuth } from '@/app/lib/auth-context'

// Mock the useApi hook
jest.mock('@/app/lib/use-api', () => ({
  useApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    loading: false
  })
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  })
}))

// Mock Next.js session
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'MERCHANT_ADMIN',
        merchantId: 'merchant-1'
      }
    },
    status: 'authenticated'
  })
}))

describe('AuthContext', () => {
  const TestComponent = () => {
    const { user, loading, login, logout } = useAuth()
    
    if (loading) return <div>Loading...</div>
    
    return (
      <div>
        <div data-testid="user-role">{user?.role}</div>
        <div data-testid="user-id">{user?.id}</div>
        <button onClick={() => login('test@example.com', 'password')}>
          Login
        </button>
        <button onClick={logout}>Logout</button>
      </div>
    )
  }

  it('provides user context to children', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-role')).toHaveTextContent('MERCHANT_ADMIN')
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-1')
    })
  })

  it('handles login function', async () => {
    const { useApi } = require('@/app/lib/use-api')
    const mockPost = jest.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'MERCHANT_ADMIN'
        },
        token: 'mock-token'
      }
    })
    
    useApi.mockReturnValue({
      post: mockPost,
      loading: false
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    loginButton.click()

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password'
      })
    })
  })

  it('handles logout function', async () => {
    const { useApi } = require('@/app/lib/use-api')
    const mockPost = jest.fn().mockResolvedValue({ success: true })
    
    useApi.mockReturnValue({
      post: mockPost,
      loading: false
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const logoutButton = screen.getByText('Logout')
    logoutButton.click()

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/auth/logout')
    })
  })

  it('shows loading state initially', () => {
    // Mock loading state
    require('@/app/lib/use-api').useApi.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      loading: true
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('handles authentication errors', async () => {
    const { useApi } = require('@/app/lib/use-api')
    const mockPost = jest.fn().mockResolvedValue({
      success: false,
      error: 'Invalid credentials'
    })
    
    useApi.mockReturnValue({
      post: mockPost,
      loading: false
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    loginButton.click()

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password'
      })
    })
  })
})

