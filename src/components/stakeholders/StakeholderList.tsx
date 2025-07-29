'use client'

import { useState, useCallback, memo } from 'react'
import { Contact, ProjectStakeholder } from '@/types'
import { Button } from '@/components/ui/Button'
import { 
  PlusIcon, 
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface StakeholderListProps {
  stakeholders: ProjectStakeholder[]
  availableContacts: Contact[]
  isLoading: boolean
  onAdd: (contactId: string) => Promise<void>
  onRemove: (contactId: string) => Promise<void>
  projectName: string
}

function StakeholderListComponent({
  stakeholders,
  availableContacts,
  isLoading,
  onAdd,
  onRemove,
  projectName,
}: StakeholderListProps) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)

  const handleRemove = useCallback(async (contactId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this stakeholder from the project? They will no longer receive RFI notifications for this project.'
    )
    
    if (!confirmed) return

    setRemovingIds(prev => new Set(prev).add(contactId))
    try {
      await onRemove(contactId)
    } catch (error) {
      // Silently handle error - could show toast notification in future
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(contactId)
        return newSet
      })
    }
  }, [onRemove])

  const handleAdd = useCallback(async () => {
    if (!selectedContactId) return

    setIsAdding(true)
    try {
      await onAdd(selectedContactId)
      setSelectedContactId('')
      setShowAddForm(false)
    } catch (error) {
      // Silently handle error - could show toast notification in future
    } finally {
      setIsAdding(false)
    }
  }, [onAdd, selectedContactId])

  // Filter out contacts that are already stakeholders
  const stakeholderContactIds = new Set(stakeholders.map(s => s.contactId))
  const availableContactsFiltered = availableContacts.filter(
    contact => !stakeholderContactIds.has(contact.id) && contact.active
  )

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-steel border border-steel-200">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-steel-900">Project Stakeholders</h3>
        </div>
        <div className="card-body space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-steel-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-steel-200 rounded w-3/4"></div>
                  <div className="h-3 bg-steel-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-steel border border-steel-200">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-steel-900">
              Project Stakeholders ({stakeholders.length})
            </h3>
            <p className="text-sm text-steel-600 mt-1">
              Stakeholders receive RFI notifications for {projectName}
            </p>
          </div>
          {availableContactsFiltered.length > 0 && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowAddForm(true)} 
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Add Stakeholder
            </Button>
          )}
        </div>
      </div>

      <div className="card-body">
        {showAddForm && (
          <div className="mb-6 p-4 bg-steel-50 rounded-lg border border-steel-200">
            <h4 className="text-sm font-medium text-steel-900 mb-3">Add Stakeholder</h4>
            <div className="flex gap-3">
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="flex-1 rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
                disabled={isAdding}
              >
                <option value="">Select a contact...</option>
                {availableContactsFiltered.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} ({contact.email})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdd}
                disabled={!selectedContactId || isAdding}
              >
                {isAdding ? 'Adding...' : 'Add'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedContactId('')
                }}
                disabled={isAdding}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {stakeholders.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
            <p className="text-steel-500 mb-4">No stakeholders assigned yet</p>
            <p className="text-sm text-steel-400 mb-4">
              Add stakeholders to receive RFI notifications for this project
            </p>
            {availableContactsFiltered.length > 0 ? (
              <Button 
                variant="primary" 
                onClick={() => setShowAddForm(true)} 
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add First Stakeholder
              </Button>
            ) : (
              <p className="text-sm text-steel-400">
                No available contacts. Add contacts to the client first.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {stakeholders.map((stakeholder) => {
              const contact = stakeholder.contact
              if (!contact) return null
              
              const isRemoving = removingIds.has(contact.id)
              
              return (
                <div key={stakeholder.id} className="border border-steel-200 rounded-lg p-4 hover:shadow-steel transition-shadow duration-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-orange-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-steel-900">
                          {contact.name}
                        </h4>
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          <UsersIcon className="w-3 h-3" />
                          <span>Stakeholder</span>
                        </div>
                      </div>
                      
                      {contact.title && (
                        <p className="text-xs text-steel-600 mb-2">{contact.title}</p>
                      )}
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4 text-steel-500" />
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-xs text-orange-600 hover:text-orange-700"
                          >
                            {contact.email}
                          </a>
                        </div>
                        
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-steel-500" />
                            <a 
                              href={`tel:${contact.phone}`}
                              className="text-xs text-orange-600 hover:text-orange-700"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-steel-500">
                        Added as stakeholder {formatDistanceToNow(new Date(stakeholder.createdAt))} ago
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemove(contact.id)}
                        disabled={isRemoving}
                        title="Remove stakeholder"
                      >
                        {isRemoving ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export const StakeholderList = memo(StakeholderListComponent)