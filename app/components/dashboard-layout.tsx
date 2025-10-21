'use client'

import { useAuth } from '@/app/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './sidebar'
import MobileMenu from './mobile-menu'
import NotificationBell from './notification-bell'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole: string
}

export default function DashboardLayout({ children, userRole: _userRole }: DashboardLayoutProps) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  // Simplified: just check if user is logged in
  // Remove the problematic role-based redirect that was breaking navigation
  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (!loading && !user) {
      router.push('/welcome')
    }
  }, [user, loading, router])

  if (loading || !user) {
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
