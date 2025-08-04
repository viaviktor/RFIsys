'use client'

import { Badge, BadgeProps } from '@/components/ui/Badge'
import { useState } from 'react'

export interface ClickableBadgeProps extends Omit<BadgeProps, 'onClick'> {
  onClick?: (value: string | number) => void
  value?: string | number
  count?: number
  showCount?: boolean
  disabled?: boolean
  active?: boolean
  tooltip?: string
}

export function ClickableBadge({
  onClick,
  value,
  count,
  showCount = false,
  disabled = false,
  active = false,
  tooltip,
  className = "",
  children,
  ...badgeProps
}: ClickableBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (!disabled && onClick && value !== undefined) {
      onClick(value)
    }
  }

  const displayText = showCount && count !== undefined 
    ? `${children} (${count})`
    : children

  const clickableClass = onClick && !disabled 
    ? `cursor-pointer transition-all duration-200 hover:shadow-sm transform hover:scale-105 ${
        isHovered ? 'ring-2 ring-orange-200' : ''
      } ${active ? 'ring-2 ring-orange-400 bg-orange-100' : ''}` 
    : disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : ''

  const badgeElement = (
    <Badge
      {...badgeProps}
      className={`${clickableClass} ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {displayText}
    </Badge>
  )

  if (tooltip) {
    return (
      <div className="relative group">
        {badgeElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-steel-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-steel-800"></div>
        </div>
      </div>
    )
  }

  return badgeElement
}

// Specialized clickable badges for common use cases
export interface StatusBadgeProps {
  status: string
  count?: number
  onFilter?: (status: string) => void
  active?: boolean
  className?: string
}

export function StatusBadge({ status, count, onFilter, active, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { variant: BadgeProps['variant'], label: string }> = {
      'DRAFT': { variant: 'secondary', label: 'Draft' },
      'OPEN': { variant: 'warning', label: 'Open' },
      'CLOSED': { variant: 'success', label: 'Closed' },
      'ACTIVE': { variant: 'success', label: 'Active' },
      'ARCHIVED': { variant: 'secondary', label: 'Archived' },
      'OVERDUE': { variant: 'error', label: 'Overdue' },
      'HIGH': { variant: 'error', label: 'High' },
      'MEDIUM': { variant: 'warning', label: 'Medium' },
      'LOW': { variant: 'secondary', label: 'Low' },
      'URGENT': { variant: 'error', label: 'Urgent' }
    }
    return statusMap[status] || { variant: 'secondary' as const, label: status }
  }

  const config = getStatusConfig(status)

  return (
    <ClickableBadge
      variant={config.variant}
      onClick={onFilter ? (value) => onFilter(value as string) : undefined}
      value={status}
      count={count}
      showCount={count !== undefined}
      active={active}
      tooltip={`Click to filter by ${config.label}`}
      className={className}
    >
      {config.label}
    </ClickableBadge>
  )
}

export interface PriorityBadgeProps {
  priority: string
  count?: number
  onFilter?: (priority: string) => void
  active?: boolean
  className?: string
}

export function PriorityBadge({ priority, count, onFilter, active, className }: PriorityBadgeProps) {
  const getPriorityConfig = (priority: string) => {
    const priorityMap: Record<string, { variant: BadgeProps['variant'], label: string }> = {
      'LOW': { variant: 'secondary', label: 'Low' },
      'MEDIUM': { variant: 'warning', label: 'Medium' },
      'HIGH': { variant: 'error', label: 'High' },
      'URGENT': { variant: 'error', label: 'Urgent' }
    }
    return priorityMap[priority] || { variant: 'secondary' as const, label: priority }
  }

  const config = getPriorityConfig(priority)

  return (
    <ClickableBadge
      variant={config.variant}
      onClick={onFilter ? (value) => onFilter(value as string) : undefined}
      value={priority}
      count={count}
      showCount={count !== undefined}
      active={active}
      tooltip={`Click to filter by ${config.label} priority`}
      className={className}
    >
      {config.label}
    </ClickableBadge>
  )
}

// Quick filter badges for dashboard stats
export interface QuickFilterBadgeProps {
  label: string
  count: number
  filterKey: string
  filterValue: string | number
  onFilter: (key: string, value: string | number) => void
  active?: boolean
  variant?: BadgeProps['variant']
  className?: string
}

export function QuickFilterBadge({
  label,
  count,
  filterKey,
  filterValue,
  onFilter,
  active,
  variant = 'primary',
  className
}: QuickFilterBadgeProps) {
  return (
    <ClickableBadge
      variant={variant}
      onClick={() => onFilter(filterKey, filterValue)}
      value={filterValue}
      count={count}
      showCount={true}
      active={active}
      tooltip={`Click to show ${label.toLowerCase()}`}
      className={className}
    >
      {label}
    </ClickableBadge>
  )
}