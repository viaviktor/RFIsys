'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface BaseLinkProps {
  children: React.ReactNode
  className?: string
  showExternalIcon?: boolean
  onClick?: () => void
}

interface ClientLinkProps extends BaseLinkProps {
  clientId: string
  clientName?: string
}

interface ProjectLinkProps extends BaseLinkProps {
  projectId: string
  projectName?: string
}

interface RFILinkProps extends BaseLinkProps {
  rfiId: string
  rfiNumber?: string
}

interface UserLinkProps extends BaseLinkProps {
  userId: string
  userName?: string
  userRole?: string
}

interface ContactLinkProps extends BaseLinkProps {
  contactId: string
  contactName?: string
  contactEmail?: string
}

// Base link component with consistent styling
const BaseEntityLink = ({ 
  href, 
  children, 
  className = '', 
  showExternalIcon = false, 
  onClick 
}: { 
  href: string 
} & BaseLinkProps) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const baseClasses = `
    inline-flex items-center gap-1 
    text-orange-600 hover:text-orange-700 
    font-medium transition-colors duration-200
    hover:underline decoration-orange-600/30 underline-offset-2
    ${className}
  `

  return (
    <Link 
      href={href}
      className={baseClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
      {showExternalIcon && (
        <ArrowTopRightOnSquareIcon 
          className={`w-3 h-3 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-60'
          }`} 
        />
      )}
    </Link>
  )
}

// Client link component
export const ClientLink = ({ 
  clientId, 
  clientName, 
  children, 
  className,
  showExternalIcon = false,
  onClick 
}: ClientLinkProps) => {
  const href = `/dashboard/clients/${clientId}`
  
  return (
    <BaseEntityLink 
      href={href} 
      className={className} 
      showExternalIcon={showExternalIcon}
      onClick={onClick}
    >
      {children || clientName || `Client ${clientId.slice(0, 8)}`}
    </BaseEntityLink>
  )
}

// Project link component
export const ProjectLink = ({ 
  projectId, 
  projectName, 
  children, 
  className,
  showExternalIcon = false,
  onClick 
}: ProjectLinkProps) => {
  const href = `/dashboard/projects/${projectId}`
  
  return (
    <BaseEntityLink 
      href={href} 
      className={className} 
      showExternalIcon={showExternalIcon}
      onClick={onClick}
    >
      {children || projectName || `Project ${projectId.slice(0, 8)}`}
    </BaseEntityLink>
  )
}

// RFI link component
export const RFILink = ({ 
  rfiId, 
  rfiNumber, 
  children, 
  className,
  showExternalIcon = false,
  onClick 
}: RFILinkProps) => {
  const href = `/dashboard/rfis/${rfiId}`
  
  return (
    <BaseEntityLink 
      href={href} 
      className={className} 
      showExternalIcon={showExternalIcon}
      onClick={onClick}
    >
      {children || rfiNumber || `RFI ${rfiId.slice(0, 8)}`}
    </BaseEntityLink>
  )
}

// User link component
export const UserLink = ({ 
  userId, 
  userName, 
  userRole, 
  children, 
  className,
  showExternalIcon = false,
  onClick 
}: UserLinkProps) => {
  const href = `/dashboard/users/${userId}`
  const displayText = userName ? 
    `${userName}${userRole ? ` (${userRole})` : ''}` : 
    `User ${userId.slice(0, 8)}`
  
  return (
    <BaseEntityLink 
      href={href} 
      className={className} 
      showExternalIcon={showExternalIcon}
      onClick={onClick}
    >
      {children || displayText}
    </BaseEntityLink>
  )
}

// Contact link component
export const ContactLink = ({ 
  contactId, 
  contactName, 
  contactEmail, 
  children, 
  className,
  showExternalIcon = false,
  onClick 
}: ContactLinkProps) => {
  const href = `/dashboard/contacts/${contactId}`
  const displayText = contactName || contactEmail || `Contact ${contactId.slice(0, 8)}`
  
  return (
    <BaseEntityLink 
      href={href} 
      className={className} 
      showExternalIcon={showExternalIcon}
      onClick={onClick}
    >
      {children || displayText}
    </BaseEntityLink>
  )
}

// Quick navigation component for related entities
interface QuickNavProps {
  items: Array<{
    type: 'client' | 'project' | 'rfi' | 'user' | 'contact'
    id: string
    label: string
    href?: string
  }>
  title?: string
  className?: string
}

export const QuickNav = ({ items, title = "Related", className = "" }: QuickNavProps) => {
  if (items.length === 0) return null

  return (
    <div className={`bg-steel-50 rounded-lg p-4 border border-steel-200 ${className}`}>
      <h4 className="text-sm font-medium text-steel-700 mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const linkClassName = "text-xs px-2 py-1 bg-white rounded border border-steel-200 hover:border-orange-300"
          
          switch (item.type) {
            case 'client':
              return (
                <ClientLink 
                  key={index}
                  clientId={item.id}
                  className={linkClassName}
                >
                  {item.label}
                </ClientLink>
              )
            case 'project':
              return (
                <ProjectLink 
                  key={index}
                  projectId={item.id}
                  className={linkClassName}
                >
                  {item.label}
                </ProjectLink>
              )
            case 'rfi':
              return (
                <RFILink 
                  key={index}
                  rfiId={item.id}
                  className={linkClassName}
                >
                  {item.label}
                </RFILink>
              )
            case 'user':
              return (
                <UserLink 
                  key={index}
                  userId={item.id}
                  className={linkClassName}
                >
                  {item.label}
                </UserLink>
              )
            case 'contact':
              return (
                <ContactLink 
                  key={index}
                  contactId={item.id}
                  className={linkClassName}
                >
                  {item.label}
                </ContactLink>
              )
            default:
              return item.href ? (
                <Link 
                  key={index}
                  href={item.href}
                  className={linkClassName}
                >
                  {item.label}
                </Link>
              ) : null
          }
        })}
      </div>
    </div>
  )
}

// Breadcrumb component for navigation context
interface BreadcrumbItem {
  label: string
  href?: string
  type?: 'client' | 'project' | 'rfi' | 'user' | 'contact'
  id?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export const EntityBreadcrumb = ({ items, className = "" }: BreadcrumbProps) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm text-steel-600 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-steel-400">/</span>
          )}
          {item.href ? (
            item.type && item.id ? (
              <EntityLinkByType 
                type={item.type}
                id={item.id}
                className="hover:text-orange-600 transition-colors"
              >
                {item.label}
              </EntityLinkByType>
            ) : (
              <Link 
                href={item.href}
                className="hover:text-orange-600 transition-colors"
              >
                {item.label}
              </Link>
            )
          ) : (
            <span className="text-steel-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

// Helper component to render links by type
const EntityLinkByType = ({ 
  type, 
  id, 
  children, 
  className 
}: { 
  type: string
  id: string
  children: React.ReactNode
  className?: string
}) => {
  switch (type) {
    case 'client':
      return <ClientLink clientId={id} className={className}>{children}</ClientLink>
    case 'project':
      return <ProjectLink projectId={id} className={className}>{children}</ProjectLink>
    case 'rfi':
      return <RFILink rfiId={id} className={className}>{children}</RFILink>
    case 'user':
      return <UserLink userId={id} className={className}>{children}</UserLink>
    case 'contact':
      return <ContactLink contactId={id} className={className}>{children}</ContactLink>
    default:
      return <span className={className}>{children}</span>
  }
}