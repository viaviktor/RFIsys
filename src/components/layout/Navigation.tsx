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
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CogIcon as CogIconSolid,
  BellIcon as BellIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  CircleStackIcon as CircleStackIconSolid
} from '@heroicons/react/24/solid'

const navigation = [
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
  { 
    name: 'Clients', 
    href: '/dashboard/clients', 
    icon: BuildingOfficeIcon, 
    iconSolid: BuildingOfficeIconSolid 
  },
]

const adminNavigation = [
  { 
    name: 'Users', 
    href: '/dashboard/admin/users', 
    icon: UserGroupIcon, 
    iconSolid: UserGroupIconSolid,
    description: 'Manage user accounts and permissions'
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

            {/* Admin Navigation */}
            {user?.role === 'ADMIN' && (
              <>
                <div className="border-t border-steel-200 mt-4 pt-4">
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-steel-500 uppercase tracking-wider">
                      Administration
                    </h3>
                  </div>
                  {adminNavigation.map((item) => {
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
                </div>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-steel-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-steel rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-construction-helmet rounded-md flex items-center justify-center">
                  <span className="text-sm font-bold text-steel-700">{user?.name?.charAt(0)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-steel-900 truncate">{user?.name}</p>
                <button
                  onClick={logout}
                  className="text-xs text-steel-500 hover:text-orange-600 transition-colors"
              >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="lg:hidden">
        {/* Mobile menu button */}
        <div className="flex items-center justify-between h-16 px-4 bg-gradient-construction shadow-steel">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-orange-600">R</span>
            </div>
            <h1 className="text-lg font-bold text-white">STEEL RFI</h1>
          </div>
          <button
            type="button"
            className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
        >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-steel-800 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-steel-lg">
              <div className="flex items-center justify-between h-16 px-4 bg-gradient-construction">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-600">R</span>
                  </div>
                  <h1 className="text-lg font-bold text-white">STEEL RFI</h1>
                </div>
                <button
                  type="button"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
              >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <nav className="flex-1 px-2 py-4 space-y-1">
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

                  {/* Admin Navigation - Mobile */}
                  {user?.role === 'ADMIN' && (
                    <>
                      <div className="border-t border-steel-200 mt-4 pt-4">
                        <div className="px-3 py-2">
                          <h3 className="text-xs font-semibold text-steel-500 uppercase tracking-wider">
                            Administration
                          </h3>
                        </div>
                        {adminNavigation.map((item) => {
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
                      </div>
                    </>
                  )}
                </nav>

                <div className="border-t border-steel-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-steel rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 bg-construction-helmet rounded-md flex items-center justify-center">
                        <span className="text-sm font-bold text-steel-700">{user?.name?.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-900 truncate">{user?.name}</p>
                      <button
                        onClick={() => {
                          logout()
                          setIsMobileMenuOpen(false)
                        }}
                        className="text-xs text-steel-500 hover:text-orange-600 transition-colors"
                    >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}