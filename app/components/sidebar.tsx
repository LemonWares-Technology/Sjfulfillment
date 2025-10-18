'use client'

import { useAuth } from '@/app/lib/auth-context'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import NotificationBell from './notification-bell'
import {
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
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'

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
    name: 'Refund Requests',
    href: '/refund-requests',
    icon: ArrowUturnLeftIcon,
    roles: ['SJFS_ADMIN', 'WAREHOUSE_STAFF']
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
    name: 'All Staff',
    href: '/admin/staff',
    icon: UserGroupIcon,
    roles: ['SJFS_ADMIN']
  },
  {
    name: 'Merchant Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCardIcon,
    roles: ['SJFS_ADMIN']
  },
  {
    name: 'Plan Management',
    href: '/merchant/plans',
    icon: CreditCardIcon,
    roles: ['MERCHANT_ADMIN']
  },
  {
    name: 'Logistics',
    href: '/logistics',
    icon: TruckIcon,
    roles: ['SJFS_ADMIN', 'WAREHOUSE_STAFF']
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    roles: ['SJFS_ADMIN', 'MERCHANT_ADMIN']
  },
  {
    name: 'Performance',
    href: '/performance',
    icon: ChartBarIcon,
    roles: ['SJFS_ADMIN']
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
    name: 'Account',
    href: '/merchant/account',
    icon: CogIcon,
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

export default function Sidebar() {
  const { user } = useAuth()
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
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A] border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-center flex-shrink-0 px-4">
            <div className="mb-4 bg-black rounded-lg flex items-center justify-center">
              <Image
                height={100}
                width={100}
                src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
                alt="SJF Logo"
                className="object-cover"
              />
            </div>

          </div>

          <nav className="mt-5 flex-1 px-2 space-y-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.name === 'Dashboard' && pathname === getDashboardHref())

              return (
                <Link
                  key={item.name}
                  href={item.name === 'Dashboard' ? getDashboardHref() : item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-[5px] ${isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-200 hover:bg-gray-50 hover:text-black'
                    }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? 'text-amber-500' : 'text-gray-200 group-hover:text-gray-500'
                      }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-white">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>
    </div>
  )
}
