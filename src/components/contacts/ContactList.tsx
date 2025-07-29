'use client'

import { useState, useCallback, memo } from 'react'
import { Contact } from '@/types'
import { Button } from '@/components/ui/Button'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'

interface ContactListProps {
  contacts: Contact[]
  isLoading: boolean
  onAdd: () => void
  onEdit: (contact: Contact) => void
  onDelete: (contactId: string) => Promise<void>
}

function ContactListComponent({
  contacts,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: ContactListProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleDelete = useCallback(async (contactId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this contact? This action cannot be undone.'
    )
    
    if (!confirmed) return

    setDeletingIds(prev => new Set(prev).add(contactId))
    try {
      await onDelete(contactId)
    } catch (error) {
      // Silently handle error - could show toast notification in future
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(contactId)
        return newSet
      })
    }
  }, [onDelete])


  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-steel border border-steel-200">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-steel-900">Contacts</h3>
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
          <h3 className="text-lg font-semibold text-steel-900">
            Contacts ({contacts.length})
          </h3>
          <Button variant="primary" size="sm" onClick={onAdd} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Add Contact
          </Button>
        </div>
      </div>

      <div className="card-body">
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
            <p className="text-steel-500 mb-4">No contacts added yet</p>
            <Button variant="primary" onClick={onAdd} leftIcon={<PlusIcon className="w-4 h-4" />}>
              Add First Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => {
              const isDeleting = deletingIds.has(contact.id)
              
              return (
                <div key={contact.id} className="border border-steel-200 rounded-lg p-4 hover:shadow-steel transition-shadow duration-200">
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
                        Added {formatDistanceToNow(new Date(contact.createdAt))} ago
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(contact)}
                        title="Edit contact"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        disabled={isDeleting}
                        title="Delete contact"
                      >
                        {isDeleting ? (
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

export const ContactList = memo(ContactListComponent)