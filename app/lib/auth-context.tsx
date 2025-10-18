'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SJFS_ADMIN' | 'MERCHANT_ADMIN' | 'MERCHANT_STAFF' | 'WAREHOUSE_STAFF'
  merchantId?: string
  twoFactorEnabled?: boolean
  merchant?: {
    id: string
    businessName: string
    onboardingStatus: string
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser?: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      fetchUserProfile(storedToken)
    } else {
      setLoading(false)
    }

    // Listen for storage changes (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          setToken(e.newValue)
          fetchUserProfile(e.newValue)
        } else {
          setToken(null)
          setUser(null)
          setLoading(false)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const fetchUserProfile = async (authToken: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.data)
        } else {
          throw new Error(data.error || 'Failed to fetch user profile')
        }
      } else {
        // Handle 401 specifically
        if (response.status === 401) {
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
          // Redirect to unauthorized page
          window.location.href = '/unauthorized'
        } else {
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    const { user: userData, token: authToken } = data.data

    setUser(userData)
    setToken(authToken)
    localStorage.setItem('token', authToken)

    // Redirect based on user role
    switch (userData.role) {
      case 'SJFS_ADMIN':
        router.push('/admin/dashboard')
        break
      case 'MERCHANT_ADMIN':
        // Check if merchant has selected services
        if (userData.merchantId) {
          try {
            const servicesResponse = await fetch('/api/merchant-services/status', {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            })
            
            if (servicesResponse.ok) {
              const servicesData = await servicesResponse.json()
              // If no services selected, redirect to service selection
              if (!servicesData.data.hasServices) {
                router.push('/service-selection')
              } else {
                router.push('/merchant/dashboard')
              }
            } else {
              // If error checking services, redirect to service selection
              router.push('/service-selection')
            }
          } catch (error) {
            // If error checking services, redirect to service selection
            router.push('/service-selection')
          }
        } else {
          router.push('/merchant/dashboard')
        }
        break
      case 'MERCHANT_STAFF':
        router.push('/staff/dashboard')
        break
      case 'WAREHOUSE_STAFF':
        router.push('/warehouse/dashboard')
        break
      default:
        router.push('/dashboard')
    }
  }

  const logout = async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    }

    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    router.push('/welcome')
  }

  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem('token')
    if (currentToken) {
      await fetchUserProfile(currentToken, true)
    }
  }

  const forceRefresh = async () => {
    const currentToken = localStorage.getItem('token')
    if (currentToken) {
      setToken(currentToken)
      await fetchUserProfile(currentToken, true)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser: forceRefresh, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
