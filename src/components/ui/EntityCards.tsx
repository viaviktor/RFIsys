'use client'

import { 
  BuildingOfficeIcon,
  FolderIcon,
  DocumentTextIcon,
  UserIcon,
  AtSymbolIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { ProjectLink, ClientLink, RFILink, UserLink, ContactLink } from './EntityLinks'
import { Badge } from './Badge'

interface BaseCardProps {
  className?: string
  onClick?: () => void
  showViewLink?: boolean
}

interface ClientCardProps extends BaseCardProps {
  client: {
    id: string
    name: string
    contactName?: string
    email?: string
    city?: string
    state?: string
    _count?: {
      projects?: number
      rfis?: number
    }
  }
}

interface ProjectCardProps extends BaseCardProps {
  project: {
    id: string
    name: string
    description?: string
    projectNumber?: string
    status?: string
    client?: {
      id: string
      name: string
    }
    manager?: {
      id: string
      name: string
    }
    _count?: {
      rfis?: number
      stakeholders?: number
    }
    createdAt?: string | Date
  }
}

interface RFICardProps extends BaseCardProps {
  rfi: {
    id: string
    rfiNumber: string
    title: string
    description?: string
    status: string
    priority: string
    urgency?: string
    dateNeededBy?: string | Date
    dateSent?: string | Date
    client?: {
      id: string
      name: string
    }
    project?: {
      id: string
      name: string
    }
    createdBy?: {
      id: string
      name: string
    }
    _count?: {
      responses?: number
      attachments?: number
    }
  }
}

interface UserCardProps extends BaseCardProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    active?: boolean
    lastLogin?: string | Date
    _count?: {
      rfisCreated?: number
      responses?: number
      projects?: number
    }
  }
}

interface ContactCardProps extends BaseCardProps {
  contact: {
    id: string
    name: string
    email: string
    phone?: string
    title?: string
    role?: string
    active?: boolean
    client?: {
      id: string
      name: string
    }
    _count?: {
      projectStakeholders?: number
    }
  }
}

// Base card component
const BaseCard = ({ 
  children, 
  className = "", 
  onClick, 
  showViewLink = false 
}: { 
  children: React.ReactNode 
} & BaseCardProps) => {
  const baseClasses = `
    bg-white rounded-lg border border-steel-200 p-4 
    transition-all duration-200 hover:shadow-md hover:border-orange-200
    ${onClick ? 'cursor-pointer hover:bg-steel-25' : ''}
    ${className}
  `

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  )
}

// Client card component
export const ClientCard = ({ client, className, onClick, showViewLink }: ClientCardProps) => {
  return (
    <BaseCard className={className} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <BuildingOfficeIcon className="w-8 h-8 text-steel-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <ClientLink 
                clientId={client.id}
                className="text-lg font-semibold text-steel-900 hover:text-orange-600"
              >
                {client.name}
              </ClientLink>
              {showViewLink && (
                <EyeIcon className="w-4 h-4 text-steel-400" />
              )}
            </div>
            
            {client.contactName && (
              <p className="text-sm text-steel-600 mt-1">
                Contact: {client.contactName}
              </p>
            )}
            
            {client.email && (
              <p className="text-sm text-steel-500 flex items-center mt-1">
                <AtSymbolIcon className="w-3 h-3 mr-1" />
                {client.email}
              </p>
            )}
            
            {(client.city || client.state) && (
              <p className="text-sm text-steel-500 mt-1">
                {[client.city, client.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {client._count && (
        <div className="mt-4 flex items-center space-x-4 text-sm text-steel-600">
          {client._count.projects !== undefined && (
            <span className="flex items-center">
              <FolderIcon className="w-4 h-4 mr-1" />
              {client._count.projects} projects
            </span>
          )}
          {client._count.rfis !== undefined && (
            <span className="flex items-center">
              <DocumentTextIcon className="w-4 h-4 mr-1" />
              {client._count.rfis} RFIs
            </span>
          )}
        </div>
      )}
    </BaseCard>
  )
}

// Project card component
export const ProjectCard = ({ project, className, onClick, showViewLink }: ProjectCardProps) => {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'ACTIVE': { variant: 'success' as const, label: 'Active' },
      'COMPLETED': { variant: 'secondary' as const, label: 'Completed' },
      'ON_HOLD': { variant: 'warning' as const, label: 'On Hold' },
      'CANCELLED': { variant: 'error' as const, label: 'Cancelled' },
    }
    return statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status }
  }

  const statusBadge = getStatusBadge(project.status || 'ACTIVE')

  return (
    <BaseCard className={className} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <FolderIcon className="w-8 h-8 text-steel-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <ProjectLink 
                projectId={project.id}
                className="text-lg font-semibold text-steel-900 hover:text-orange-600"
              >
                {project.name}
              </ProjectLink>
              {showViewLink && (
                <EyeIcon className="w-4 h-4 text-steel-400" />
              )}
            </div>
            
            {project.projectNumber && (
              <p className="text-sm text-steel-600 mt-1">
                #{project.projectNumber}
              </p>
            )}
            
            {project.description && (
              <p className="text-sm text-steel-500 mt-2 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>
        
        <Badge variant={statusBadge.variant}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {project.client && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Client:</span>
            <ClientLink clientId={project.client.id}>
              {project.client.name}
            </ClientLink>
          </div>
        )}
        
        {project.manager && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Manager:</span>
            <UserLink userId={project.manager.id}>
              {project.manager.name}
            </UserLink>
          </div>
        )}
      </div>

      {project._count && (
        <div className="mt-4 flex items-center space-x-4 text-sm text-steel-600">
          {project._count.rfis !== undefined && (
            <span className="flex items-center">
              <DocumentTextIcon className="w-4 h-4 mr-1" />
              {project._count.rfis} RFIs
            </span>
          )}
          {project._count.stakeholders !== undefined && (
            <span className="flex items-center">
              <UserIcon className="w-4 h-4 mr-1" />
              {project._count.stakeholders} stakeholders
            </span>
          )}
        </div>
      )}
    </BaseCard>
  )
}

// RFI card component
export const RFICard = ({ rfi, className, onClick, showViewLink }: RFICardProps) => {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'DRAFT': { variant: 'secondary' as const, label: 'Draft' },
      'OPEN': { variant: 'warning' as const, label: 'Open' },
      'CLOSED': { variant: 'success' as const, label: 'Closed' },
    }
    return statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status }
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      'LOW': { variant: 'secondary' as const, label: 'Low' },
      'MEDIUM': { variant: 'warning' as const, label: 'Medium' },
      'HIGH': { variant: 'error' as const, label: 'High' },
      'URGENT': { variant: 'error' as const, label: 'Urgent' },
    }
    return priorityMap[priority as keyof typeof priorityMap] || { variant: 'secondary' as const, label: priority }
  }

  const statusBadge = getStatusBadge(rfi.status)
  const priorityBadge = getPriorityBadge(rfi.priority)

  return (
    <BaseCard className={className} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DocumentTextIcon className="w-8 h-8 text-steel-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <RFILink 
                rfiId={rfi.id}
                className="text-lg font-semibold text-steel-900 hover:text-orange-600"
              >
                {rfi.rfiNumber}
              </RFILink>
              {showViewLink && (
                <EyeIcon className="w-4 h-4 text-steel-400" />
              )}
            </div>
            
            <h3 className="text-sm font-medium text-steel-800 mt-1">
              {rfi.title}
            </h3>
            
            {rfi.description && (
              <p className="text-sm text-steel-500 mt-2 line-clamp-2">
                {rfi.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-1">
          <Badge variant={statusBadge.variant}>
            {statusBadge.label}
          </Badge>
          <Badge variant={priorityBadge.variant}>
            {priorityBadge.label}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {rfi.project && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Project:</span>
            <ProjectLink projectId={rfi.project.id}>
              {rfi.project.name}
            </ProjectLink>
          </div>
        )}
        
        {rfi.client && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Client:</span>
            <ClientLink clientId={rfi.client.id}>
              {rfi.client.name}
            </ClientLink>
          </div>
        )}
        
        {rfi.createdBy && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Created by:</span>
            <UserLink userId={rfi.createdBy.id}>
              {rfi.createdBy.name}
            </UserLink>
          </div>
        )}
      </div>

      {(rfi.dateNeededBy || rfi.dateSent) && (
        <div className="mt-4 flex items-center space-x-4 text-sm text-steel-600">
          {rfi.dateSent && (
            <span className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-1" />
              Sent {new Date(rfi.dateSent).toLocaleDateString()}
            </span>
          )}
          {rfi.dateNeededBy && (
            <span className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              Due {new Date(rfi.dateNeededBy).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {rfi._count && (
        <div className="mt-4 flex items-center space-x-4 text-sm text-steel-600">
          {rfi._count.responses !== undefined && (
            <span className="flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              {rfi._count.responses} responses
            </span>
          )}
          {rfi._count.attachments !== undefined && (
            <span className="flex items-center">
              <DocumentTextIcon className="w-4 h-4 mr-1" />
              {rfi._count.attachments} attachments
            </span>
          )}
        </div>
      )}
    </BaseCard>
  )
}

// Contact card component
export const ContactCard = ({ contact, className, onClick, showViewLink }: ContactCardProps) => {
  const getRoleBadge = (role: string) => {
    const roleMap = {
      'STAKEHOLDER_L1': { variant: 'primary' as const, label: 'L1 Stakeholder' },
      'STAKEHOLDER_L2': { variant: 'secondary' as const, label: 'L2 Stakeholder' },
    }
    return roleMap[role as keyof typeof roleMap] || { variant: 'secondary' as const, label: role }
  }

  const roleBadge = contact.role ? getRoleBadge(contact.role) : null

  return (
    <BaseCard className={className} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <UserIcon className="w-8 h-8 text-steel-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <ContactLink 
                contactId={contact.id}
                className="text-lg font-semibold text-steel-900 hover:text-orange-600"
              >
                {contact.name}
              </ContactLink>
              {showViewLink && (
                <EyeIcon className="w-4 h-4 text-steel-400" />
              )}
              {!contact.active && (
                <Badge variant="error">Inactive</Badge>
              )}
            </div>
            
            {contact.title && (
              <p className="text-sm text-steel-600 mt-1">
                {contact.title}
              </p>
            )}
            
            <p className="text-sm text-steel-500 flex items-center mt-1">
              <AtSymbolIcon className="w-3 h-3 mr-1" />
              {contact.email}
            </p>
            
            {contact.phone && (
              <p className="text-sm text-steel-500 mt-1">
                {contact.phone}
              </p>
            )}
          </div>
        </div>
        
        {roleBadge && (
          <Badge variant={roleBadge.variant}>
            {roleBadge.label}
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {contact.client && (
          <div className="flex items-center text-sm text-steel-600">
            <span className="text-steel-500 mr-2">Company:</span>
            <ClientLink clientId={contact.client.id}>
              {contact.client.name}
            </ClientLink>
          </div>
        )}
      </div>

      {contact._count && (
        <div className="mt-4 flex items-center space-x-4 text-sm text-steel-600">
          {contact._count.projectStakeholders !== undefined && (
            <span className="flex items-center">
              <FolderIcon className="w-4 h-4 mr-1" />
              {contact._count.projectStakeholders} projects
            </span>
          )}
        </div>
      )}
    </BaseCard>
  )
}

// Grid layout for cards
interface EntityGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export const EntityGrid = ({ children, columns = 3, className = "" }: EntityGridProps) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {children}
    </div>
  )
}