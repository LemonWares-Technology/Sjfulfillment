'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './sidebar'
import MobileMenu from './mobile-menu'
import NotificationBell from './notification-bell'
import ConnectionStatus from './connection-status'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: string
}

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if user is trying to access a page they don't have permission for
    if (user && user.role !== userRole) {
      // Check if the current page is accessible by the user's role
      const currentPath = window.location.pathname
      const isAccessible = checkPageAccess(user.role, currentPath)
      
      if (!isAccessible) {
        // Redirect to appropriate dashboard based on role
        switch (user.role) {
          case 'SJFS_ADMIN':
            router.push('/admin/dashboard')
            break
          case 'MERCHANT_ADMIN':
            router.push('/merchant/dashboard')
            break
          case 'MERCHANT_STAFF':
            router.push('/staff/dashboard')
            break
          case 'WAREHOUSE_STAFF':
            router.push('/warehouse/dashboard')
            break
        }
      }
    }
  }, [user, userRole, router])

  const checkPageAccess = (userRole: string, path: string): boolean => {
    // SJFS_ADMIN has access to everything
    if (userRole === 'SJFS_ADMIN') {
      return true
    }
    
    // Define which pages each role can access
    const rolePermissions: Record<string, string[]> = {
      'MERCHANT_ADMIN': ['/merchant', '/analytics', '/products', '/orders', '/returns', '/notifications', '/service-selection', '/merchant-registration-success'],
      'MERCHANT_STAFF': ['/products', '/orders', '/returns', '/notifications', '/staff'],
      'WAREHOUSE_STAFF': ['/warehouses', '/logistics', '/orders', '/returns', '/notifications', '/warehouse', '/inventory', '/refund-requests']
    }
    
    const allowedPaths = rolePermissions[userRole] || []
    return allowedPaths.some(allowedPath => path.startsWith(allowedPath))
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <nav className="bg-black  shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <MobileMenu />
                <div className="flex-shrink-0 flex items-center ml-4">
                  <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                    <Image 
                      width={100}
                      height={100}
                      src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
                      alt="SJF Logo"
                      className="h-10 w-10 hidden max-md:flex object-contain"
                    />
                  </div>
                  {/* <span className="ml-2 text-xl font-semibold text-black">
                    SJFulfillment
                  </span> */}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <span className="hidden sm:block text-sm text-white">
                  Welcome, {user.firstName} {user.lastName}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {user.role.replace('_', ' ')}
                </span>
                <button
                  onClick={logout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-[5px] text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
