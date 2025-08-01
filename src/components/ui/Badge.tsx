import React, { memo } from 'react'
import { RFIStatus, ProjectStatus, Priority } from '@/types'

interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'error'
  children: React.ReactNode
  className?: string
}

const BadgeComponent = ({ variant = 'default', children, className = '' }: BadgeProps) => {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  )
}

export const Badge = memo(BadgeComponent)

interface StatusBadgeProps {
  status: RFIStatus
  className?: string
}

const StatusBadgeComponent = ({ status, className = '' }: StatusBadgeProps) => {
  const statusConfig = {
    DRAFT: { label: 'Draft', icon: '📝' },
    OPEN: { label: 'Open', icon: '⏳' },
    CLOSED: { label: 'Closed', icon: '✅' },
  }

  const config = statusConfig[status]

  return (
    <span className={`badge-${status.toLowerCase().replace('_', '-')} ${className}`.trim()}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}

export const StatusBadge = memo(StatusBadgeComponent)

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

const PriorityBadgeComponent = ({ priority, className = '' }: PriorityBadgeProps) => {
  const priorityConfig = {
    LOW: { label: 'Low', icon: '🟢' },
    MEDIUM: { label: 'Medium', icon: '🟡' },
    HIGH: { label: 'High', icon: '🟠' },
    URGENT: { label: 'Urgent', icon: '🔴' },
  }

  const config = priorityConfig[priority]

  return (
    <span className={`badge-${priority.toLowerCase()} ${className}`.trim()}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}

export const PriorityBadge = memo(PriorityBadgeComponent)

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

const ProjectStatusBadgeComponent = ({ status, className = '' }: ProjectStatusBadgeProps) => {
  const statusConfig = {
    ACTIVE: { label: 'Active', icon: '🔄' },
    COMPLETED: { label: 'Completed', icon: '✅' },
    ON_HOLD: { label: 'On Hold', icon: '⏸️' },
    CANCELLED: { label: 'Cancelled', icon: '❌' },
    ARCHIVED: { label: 'Archived', icon: '📦' },
  }

  const config = statusConfig[status]

  return (
    <span className={`badge-${status.toLowerCase().replace('_', '-')} ${className}`.trim()}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}

export const ProjectStatusBadge = memo(ProjectStatusBadgeComponent)