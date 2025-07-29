'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'left', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`dropdown relative inline-block ${className}`} ref={dropdownRef}>
      <div 
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`dropdown-menu ${align === 'right' ? 'dropdown-menu-right' : 'dropdown-menu-left'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ReactNode
  disabled?: boolean
  destructive?: boolean
}

export function DropdownItem({ 
  children, 
  onClick, 
  icon, 
  disabled = false, 
  destructive = false 
}: DropdownItemProps) {
  return (
    <button
      className={`dropdown-item ${destructive ? 'dropdown-item-destructive' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="dropdown-item-icon">{icon}</span>}
      {children}
    </button>
  )
}

interface DropdownDividerProps {}

export function DropdownDivider({}: DropdownDividerProps) {
  return <div className="dropdown-divider" />
}

// Action Menu Component for RFI Items
interface RFIActionMenuProps {
  rfi: any
  onView?: (rfi: any) => void
  onEdit?: (rfi: any) => void
  onDuplicate?: (rfi: any) => void
  onExport?: (rfi: any) => void
  onDelete?: (rfi: any) => void
}

export function RFIActionMenu({ 
  rfi, 
  onView, 
  onEdit, 
  onDuplicate, 
  onExport, 
  onDelete 
}: RFIActionMenuProps) {
  return (
    <Dropdown
      trigger={
        <button className="action-menu-trigger">
          <span className="sr-only">Open actions menu</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      }
      align="right"
    >
      <DropdownItem 
        onClick={() => onView?.(rfi)}
        icon={<EyeIcon className="w-4 h-4" />}
      >
        Quick View
      </DropdownItem>
      <DropdownItem 
        onClick={() => onEdit?.(rfi)}
        icon={<PencilIcon className="w-4 h-4" />}
      >
        Edit RFI
      </DropdownItem>
      <DropdownItem 
        onClick={() => onDuplicate?.(rfi)}
        icon={<DocumentDuplicateIcon className="w-4 h-4" />}
      >
        Duplicate
      </DropdownItem>
      <DropdownItem 
        onClick={() => onExport?.(rfi)}
        icon={<DocumentArrowDownIcon className="w-4 h-4" />}
      >
        Export PDF
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem 
        onClick={() => onDelete?.(rfi)}
        icon={<TrashIcon className="w-4 h-4" />}
        destructive
      >
        Delete
      </DropdownItem>
    </Dropdown>
  )
}

// Action Menu Component for Project Items
interface ProjectActionMenuProps {
  project: any
  onView?: (project: any) => void
  onEdit?: (project: any) => void
  onArchive?: (project: any) => void
  onUnarchive?: (project: any) => void
  onDelete?: (project: any) => void
  canManage?: boolean
  canDelete?: boolean
}

export function ProjectActionMenu({ 
  project, 
  onView, 
  onEdit, 
  onArchive,
  onUnarchive,
  onDelete,
  canManage = false,
  canDelete = false
}: ProjectActionMenuProps) {
  return (
    <Dropdown
      trigger={
        <button className="action-menu-trigger">
          <span className="sr-only">Open actions menu</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      }
      align="right"
    >
      <DropdownItem 
        onClick={() => onView?.(project)}
        icon={<EyeIcon className="w-4 h-4" />}
      >
        View Details
      </DropdownItem>
      <DropdownItem 
        onClick={() => onEdit?.(project)}
        icon={<PencilIcon className="w-4 h-4" />}
      >
        Edit Project
      </DropdownItem>
      
      {canManage && (
        <>
          <DropdownDivider />
          {project.status === 'ARCHIVED' ? (
            <DropdownItem 
              onClick={() => onUnarchive?.(project)}
              icon={<ArchiveBoxXMarkIcon className="w-4 h-4" />}
            >
              Unarchive
            </DropdownItem>
          ) : (
            <DropdownItem 
              onClick={() => onArchive?.(project)}
              icon={<ArchiveBoxIcon className="w-4 h-4" />}
            >
              Archive
            </DropdownItem>
          )}
          
          {canDelete && (
            <DropdownItem 
              onClick={() => onDelete?.(project)}
              icon={<TrashIcon className="w-4 h-4" />}
              destructive
            >
              Delete
            </DropdownItem>
          )}
        </>
      )}
    </Dropdown>
  )
}

// Action Menu Component for Client Items
interface ClientActionMenuProps {
  client: any
  onView?: (client: any) => void
  onEdit?: (client: any) => void
  onDelete?: (client: any) => void
  canDelete?: boolean
}

export function ClientActionMenu({ 
  client, 
  onView, 
  onEdit, 
  onDelete,
  canDelete = false
}: ClientActionMenuProps) {
  return (
    <Dropdown
      trigger={
        <button className="action-menu-trigger">
          <span className="sr-only">Open actions menu</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      }
      align="right"
    >
      <DropdownItem 
        onClick={() => onView?.(client)}
        icon={<EyeIcon className="w-4 h-4" />}
      >
        View Details
      </DropdownItem>
      <DropdownItem 
        onClick={() => onEdit?.(client)}
        icon={<PencilIcon className="w-4 h-4" />}
      >
        Edit Client
      </DropdownItem>
      
      {canDelete && (
        <>
          <DropdownDivider />
          <DropdownItem 
            onClick={() => onDelete?.(client)}
            icon={<TrashIcon className="w-4 h-4" />}
            destructive
          >
            Delete
          </DropdownItem>
        </>
      )}
    </Dropdown>
  )
}

// Import the required icons
import { 
  EyeIcon, 
  PencilIcon, 
  DocumentDuplicateIcon, 
  DocumentArrowDownIcon, 
  TrashIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon
} from '@heroicons/react/24/outline'