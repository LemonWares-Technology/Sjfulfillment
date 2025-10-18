'use client'

import { useState } from 'react'
import { useAuth } from '@/app/lib/auth-context'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon, 
  BuildingStorefrontIcon, 
  CubeIcon, 
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  BellIcon,
  CogIcon,
  UserGroupIcon,
  TruckIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Products',
    href: '/products',
    icon: CubeIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF']
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: BuildingOfficeIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ClipboardDocumentListIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Warehouses',
    href: '/warehouses',
    icon: BuildingOfficeIcon,
    roles: ['SJFS_ADMIN', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Merchants',
    href: '/admin/merchants',
    icon: BuildingStorefrontIcon,
    roles: ['SJFS_ADMIN']
  },
  {
    name: 'Subscriptions',
    href: '/subscriptions',
    icon: CreditCardIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN']
  },
  {
    name: 'Logistics',
    href: '/logistics',
    icon: TruckIcon,
    roles: ['SJFS_ADMIN', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Returns',
    href: '/returns',
    icon: ArrowPathIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Staff',
    href: '/merchant/staff',
    icon: UserGroupIcon,
    roles: ['MERCHANT_ADMIN']
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: DocumentTextIcon,
    roles: ['SJFS_ADMIN']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN']
  },
  {
    name: 'Telegram',
    href: '/auth/telegram-register',
    icon: ChatBubbleLeftRightIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_STAFF', 'WAREHOUSE_STAFF']
  }
]

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user.role)
  )

  const getDashboardHref = () => {
    switch (user.role) {
      case 'SJFS_ADMIN':
        return '/admin/dashboard'
      case 'MERCHANT_ADMIN':
        return '/merchant/dashboard'
      case 'MERCHANT_STAFF':
        return '/staff/dashboard'
      case 'WAREHOUSE_STAFF':
        return '/warehouse/dashboard'
      default:
        return '/dashboard'
    }
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-md"
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsOpen(false)} />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                  <img 
                    src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
                    alt="SJF Logo"
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  SJFulfillment
                </span>
              </div>
              
              <nav className="mt-5 px-2 space-y-1">
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.name === 'Dashboard' && pathname === getDashboardHref())
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.name === 'Dashboard' ? getDashboardHref() : item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive
                          ? 'bg-amber-100 text-amber-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-4 flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
