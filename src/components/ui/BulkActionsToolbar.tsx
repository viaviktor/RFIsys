'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { 
  TrashIcon,
  ArchiveBoxIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export interface BulkAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'primary' | 'secondary' | 'danger' | 'warning'
  requiresConfirmation?: boolean
  confirmTitle?: string
  confirmMessage?: string
  confirmButtonText?: string
}

export interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onClearSelection: () => void
  actions: BulkAction[]
  onAction: (actionId: string) => void | Promise<void>
  isLoading?: boolean
  className?: string
  onError?: (error: string) => void
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  onAction,
  isLoading = false,
  className = "",
  onError
}: BulkActionsToolbarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  if (selectedCount === 0) return null

  const handleAction = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action)
      return
    }

    await executeAction(action)
  }

  const executeAction = async (action: BulkAction) => {
    console.log('🔄 Executing action:', action.id, 'Selected count:', selectedCount)
    setIsExecuting(true)
    try {
      await onAction(action.id)
      console.log('✅ Action completed successfully:', action.id)
      if (confirmAction) {
        setConfirmAction(null)
      }
    } catch (error) {
      console.error('❌ Bulk action failed:', error)
      if (onError) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        onError(errorMessage)
      }
      // Keep the modal open if there's an error so user can see what happened
      // Don't close the modal on error - let user manually close it
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <>
      <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-orange-800">
              {selectedCount} of {totalCount} items selected
            </div>
            <div className="flex items-center gap-2">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.id}
                    variant={action.variant || 'secondary'}
                    size="sm"
                    onClick={() => handleAction(action)}
                    disabled={isLoading || isExecuting}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                )
              })}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isLoading || isExecuting}
            className="text-orange-600 hover:text-orange-700"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.confirmTitle || 'Confirm Action'}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                    Are you sure?
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {confirmAction.confirmMessage || 
                     `This will ${confirmAction.label.toLowerCase()} ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}.`
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setConfirmAction(null)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction.variant || 'danger'}
                onClick={() => executeAction(confirmAction)}
                disabled={isExecuting}
              >
                {isExecuting ? 'Processing...' : (confirmAction.confirmButtonText || confirmAction.label)}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// Common bulk actions for reuse
export const commonBulkActions = {
  delete: {
    id: 'delete',
    label: 'Delete Selected',
    icon: TrashIcon,
    variant: 'danger' as const,
    requiresConfirmation: true,
    confirmTitle: 'Delete Items',
    confirmMessage: 'This action cannot be undone. Are you sure you want to delete the selected items?',
    confirmButtonText: 'Delete'
  },
  archive: {
    id: 'archive',
    label: 'Archive Selected',
    icon: ArchiveBoxIcon,
    variant: 'secondary' as const,
    requiresConfirmation: true,
    confirmTitle: 'Archive Items',
    confirmMessage: 'Are you sure you want to archive the selected items?',
    confirmButtonText: 'Archive'
  },
  export: {
    id: 'export',
    label: 'Export Selected',
    icon: DocumentArrowDownIcon,
    variant: 'secondary' as const,
    requiresConfirmation: false
  }
}