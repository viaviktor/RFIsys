'use client'

import React, { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl'
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-steel-900 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`modal-content w-full ${sizeClasses[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              {showCloseButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="modal-close"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick View Modal for RFI Details
interface RFIQuickViewProps {
  rfi: any
  isOpen: boolean
  onClose: () => void
}

export function RFIQuickView({ rfi, isOpen, onClose }: RFIQuickViewProps) {
  if (!rfi) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`RFI ${rfi.rfiNumber}`} size="lg">
      <div className="space-y-4">
        <div className="rfi-quick-header">
          <h4 className="text-lg font-semibold text-steel-900">{rfi.title}</h4>
          <div className="flex gap-2 mt-2">
            <span className={`badge-${rfi.status.toLowerCase().replace('_', '-')}`}>
              {rfi.status.replace('_', ' ')}
            </span>
            <span className={`badge-${rfi.priority.toLowerCase()}`}>
              {rfi.priority}
            </span>
          </div>
        </div>
        
        <div className="rfi-quick-content">
          <p className="text-steel-700">{rfi.description}</p>
        </div>
        
        <div className="rfi-quick-meta">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-steel-600">Client:</span>
              <span className="ml-2 text-steel-900">{rfi.client?.name}</span>
            </div>
            <div>
              <span className="font-medium text-steel-600">Project:</span>
              <span className="ml-2 text-steel-900">{rfi.project?.name}</span>
            </div>
            <div>
              <span className="font-medium text-steel-600">Due Date:</span>
              <span className="ml-2 text-steel-900">{rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : 'Not set'}</span>
            </div>
            <div>
              <span className="font-medium text-steel-600">Responses:</span>
              <span className="ml-2 text-steel-900">{rfi._count?.responses || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="rfi-quick-actions">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              variant="primary"
              onClick={() => window.location.href = `/dashboard/rfis/${rfi.id}`}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}