'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeftIcon, 
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { Button } from './Button'
import { Dropdown, DropdownItem } from './Dropdown'

interface ContextualNavProps {
  title: string
  subtitle?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    icon?: React.ReactNode
  }>
  onBack?: () => void
  showBackButton?: boolean
  className?: string
}

export const ContextualNav = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  onBack,
  showBackButton = true,
  className = ""
}: ContextualNavProps) => {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(false)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const handleBookmark = () => {
    // TODO: Implement bookmarking functionality
    setIsBookmarked(!isBookmarked)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // Split actions into primary (first 3) and overflow
  const primaryActions = actions.slice(0, 3)
  const overflowActions = actions.slice(3)

  return (
    <div className={`bg-white border-b border-steel-200 ${className}`}>
      <div className="px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm text-steel-600 mb-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-steel-400">/</span>
                )}
                {crumb.href ? (
                  <button
                    onClick={() => router.push(crumb.href!)}
                    className="hover:text-orange-600 transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-steel-900 font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Main content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-steel-100 transition-colors"
                title="Go back"
              >
                <ChevronLeftIcon className="w-5 h-5 text-steel-600" />
              </button>
            )}
            
            <div>
              <h1 className="text-xl font-bold text-steel-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-steel-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Quick actions */}
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                  : 'text-steel-600 hover:bg-steel-100'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
            >
              <BookmarkIcon className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg text-steel-600 hover:bg-steel-100 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>

            {/* Primary actions */}
            {primaryActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || 'ghost'}
                size="sm"
                className="flex items-center space-x-2"
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}

            {/* Overflow menu */}
            {overflowActions.length > 0 && (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm">
                    <EllipsisHorizontalIcon className="w-4 h-4" />
                  </Button>
                }
              >
                {overflowActions.map((action, index) => (
                  <DropdownItem 
                    key={index} 
                    onClick={action.onClick}
                    icon={action.icon}
                  >
                    {action.label}
                  </DropdownItem>
                ))}
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Smart navigation component that adapts based on current page
interface SmartNavProps {
  entityType: 'rfi' | 'project' | 'client' | 'user' | 'contact'
  entityId: string
  entityData?: any
  className?: string
}

export const SmartNav = ({ 
  entityType, 
  entityId, 
  entityData,
  className 
}: SmartNavProps) => {
  const router = useRouter()

  const getNavConfig = () => {
    switch (entityType) {
      case 'rfi':
        return {
          title: entityData?.rfiNumber || `RFI ${entityId.slice(0, 8)}`,
          subtitle: entityData?.title,
          breadcrumbs: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'RFIs', href: '/dashboard/rfis' },
            { label: entityData?.rfiNumber || 'RFI' },
          ],
          actions: [
            {
              label: 'Edit',
              onClick: () => router.push(`/dashboard/rfis/${entityId}/edit`),
              variant: 'outline' as const,
            },
            {
              label: 'Send Email',
              onClick: () => {/* TODO: Open email modal */},
              variant: 'primary' as const,
            },
            {
              label: 'Generate PDF',
              onClick: () => window.open(`/api/rfis/${entityId}/pdf`),
              variant: 'ghost' as const,
            },
          ],
        }

      case 'project':
        return {
          title: entityData?.name || `Project ${entityId.slice(0, 8)}`,
          subtitle: entityData?.description,
          breadcrumbs: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Projects', href: '/dashboard/projects' },
            { label: entityData?.name || 'Project' },
          ],
          actions: [
            {
              label: 'Edit',
              onClick: () => router.push(`/dashboard/projects/${entityId}/edit`),
              variant: 'outline' as const,
            },
            {
              label: 'New RFI',
              onClick: () => router.push(`/dashboard/rfis/new?projectId=${entityId}`),
              variant: 'primary' as const,
            },
            {
              label: 'Manage Stakeholders',
              onClick: () => router.push(`/dashboard/projects/${entityId}/stakeholders`),
              variant: 'ghost' as const,
            },
          ],
        }

      case 'client':
        return {
          title: entityData?.name || `Client ${entityId.slice(0, 8)}`,
          subtitle: entityData?.contactName ? `Contact: ${entityData.contactName}` : undefined,
          breadcrumbs: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clients', href: '/dashboard/clients' },
            { label: entityData?.name || 'Client' },
          ],
          actions: [
            {
              label: 'Edit',
              onClick: () => router.push(`/dashboard/clients/${entityId}/edit`),
              variant: 'outline' as const,
            },
            {
              label: 'New Project',
              onClick: () => router.push(`/dashboard/projects/new?clientId=${entityId}`),
              variant: 'primary' as const,
            },
            {
              label: 'View Projects',
              onClick: () => router.push(`/dashboard/projects?clientId=${entityId}`),
              variant: 'ghost' as const,
            },
          ],
        }

      default:
        return {
          title: `${entityType} ${entityId.slice(0, 8)}`,
          breadcrumbs: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: entityType },
          ],
          actions: [],
        }
    }
  }

  const config = getNavConfig()

  return (
    <ContextualNav
      title={config.title}
      subtitle={config.subtitle}
      breadcrumbs={config.breadcrumbs}
      actions={config.actions}
      className={className}
    />
  )
}

// Hook for managing navigation history and context
export const useNavigation = () => {
  const router = useRouter()
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    // Track navigation history
    const currentPath = window.location.pathname
    setHistory(prev => {
      const newHistory = [...prev, currentPath]
      // Keep only last 10 entries
      return newHistory.slice(-10)
    })
  }, [])

  const goBack = (steps = 1) => {
    if (history.length > steps) {
      const targetPath = history[history.length - steps - 1]
      router.push(targetPath)
    } else {
      router.back()
    }
  }

  const hasHistory = history.length > 1

  return {
    history,
    goBack,
    hasHistory,
    currentPath: history[history.length - 1] || '',
  }
}