'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { 
  HomeIcon,
  BuildingOfficeIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  BellIcon,
  UserGroupIcon,
  CircleStackIcon,
  AtSymbolIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CogIcon as CogIconSolid,
  BellIcon as BellIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  CircleStackIcon as CircleStackIconSolid,
  AtSymbolIcon as AtSymbolIconSolid
} from '@heroicons/react/24/solid'

const getNavigation = (user: any) => {
  const baseNav = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon, 
      iconSolid: HomeIconSolid 
    },
    { 
      name: 'RFIs', 
      href: '/dashboard/rfis', 
      icon: DocumentTextIcon, 
      iconSolid: DocumentTextIconSolid 
    },
    { 
      name: 'Projects', 
      href: '/dashboard/projects', 
      icon: Squares2X2Icon, 
      iconSolid: Squares2X2IconSolid 
    },
  ]

  // Internal users get full navigation
  if (user?.userType === 'internal') {
    return [
      ...baseNav,
      { 
        name: 'Clients', 
        href: '/dashboard/clients', 
        icon: BuildingOfficeIcon, 
        iconSolid: BuildingOfficeIconSolid 
      },
    ]
  }

  // Stakeholder L1 gets contact management
  if (user?.role === 'STAKEHOLDER_L1') {
    return [
      ...baseNav,
      { 
        name: 'Team Members', 
        href: '/dashboard/contacts', 
        icon: UserGroupIcon, 
        iconSolid: UserGroupIconSolid 
      },
    ]
  }

  // Stakeholder L2 gets basic navigation only
  return baseNav
}

const adminNavigation = [
  { 
    name: 'Users', 
    href: '/dashboard/admin/users', 
    icon: UserGroupIcon, 
    iconSolid: UserGroupIconSolid,
    description: 'Manage user accounts and permissions'
  },
  { 
    name: 'Access Requests', 
    href: '/dashboard/admin/access-requests', 
    icon: AtSymbolIcon, 
    iconSolid: AtSymbolIconSolid,
    description: 'Review stakeholder access requests'
  },
  { 
    name: 'Settings', 
    href: '/dashboard/admin/settings', 
    icon: CogIcon, 
    iconSolid: CogIconSolid,
    description: 'Configure system settings'
  },
  { 
    name: 'Reminders', 
    href: '/dashboard/admin/reminders', 
    icon: BellIcon, 
    iconSolid: BellIconSolid,
    description: 'Manage RFI email reminders'
  },
  { 
    name: 'Data', 
    href: '/dashboard/admin/data', 
    icon: CircleStackIcon, 
    iconSolid: CircleStackIconSolid,
    description: 'Export and backup system data'
  },
  { 
    name: 'System', 
    href: '/dashboard/admin/system', 
    icon: CogIcon, 
    iconSolid: CogIconSolid,
    description: 'System status and monitoring'
  },
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = getNavigation(user)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 ${className}`}>
        <div className="flex flex-col flex-1 bg-white border-r border-steel-200 shadow-steel">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 bg-gradient-construction">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-steel">
                <span className="text-xl font-bold text-orange-600">R</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                STEEL RFI
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = isActive ? item.iconSolid : item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Admin Navigation - only for internal admin users */}
            {user?.userType === 'internal' && user?.role === 'ADMIN' && (
              <div className="pt-6">
                <h3 className="px-3 text-xs font-semibold text-steel-500 uppercase tracking-wider">
                  Administration
                </h3>
                <div className="mt-2 space-y-1">
                  {adminNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href)
                    const Icon = isActive ? item.iconSolid : item.icon
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-steel-200">
            <div className="flex items-center">
              <Link href="/dashboard/account" className="flex items-center flex-1 hover:bg-steel-50 rounded-lg p-2 -m-2">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-steel-900">{user?.name}</p>
                  <p className="text-xs text-steel-600">
                    {user?.userType === 'stakeholder' 
                      ? user?.role === 'STAKEHOLDER_L1' ? 'L1 Stakeholder' : 'L2 Stakeholder'
                      : user?.role || 'User'}
                  </p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-steel-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span className="hidden xl:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-steel-200 shadow-steel">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <h1 className="text-lg font-bold text-steel-900">STEEL RFI</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-steel-600 hover:text-steel-900 hover:bg-steel-100"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-steel-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl">
              <div className="flex items-center h-16 px-6 bg-gradient-construction">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-steel">
                    <span className="text-xl font-bold text-orange-600">R</span>
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    STEEL RFI
                  </h1>
                </div>
              </div>

              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const Icon = isActive ? item.iconSolid : item.icon
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}

                {/* Admin Navigation - only for internal admin users */}
                {user?.userType === 'internal' && user?.role === 'ADMIN' && (
                  <div className="pt-6">
                    <h3 className="px-3 text-xs font-semibold text-steel-500 uppercase tracking-wider">
                      Administration
                    </h3>
                    <div className="mt-2 space-y-1">
                      {adminNavigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href)
                        const Icon = isActive ? item.iconSolid : item.icon
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </nav>

              <div className="p-4 border-t border-steel-200">
                <div className="flex items-center">
                  <Link 
                    href="/dashboard/account" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center flex-1 hover:bg-steel-50 rounded-lg p-2 -m-2"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-steel-900">{user?.name}</p>
                      <p className="text-xs text-steel-600">
                        {user?.userType === 'stakeholder' 
                          ? user?.role === 'STAKEHOLDER_L1' ? 'L1 Stakeholder' : 'L2 Stakeholder'
                          : user?.role || 'User'}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-steel-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}