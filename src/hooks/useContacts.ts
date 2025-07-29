'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { Contact } from '@/types'

export function useClientContacts(clientId: string | null, activeOnly = true) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchContacts = async () => {
    if (!clientId) {
      setContacts([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const data = await apiClient.getClientContacts(clientId, activeOnly)
      setContacts(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'))
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [clientId, activeOnly])

  const createContact = async (contactData: Omit<Contact, 'id' | 'clientId' | 'active' | 'createdAt' | 'updatedAt' | 'client'>) => {
    if (!clientId) throw new Error('No client ID provided')

    try {
      const newContact = await apiClient.createContact(clientId, contactData)
      setContacts(prev => [newContact, ...prev])
      return newContact
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create contact')
    }
  }

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    try {
      const updatedContact = await apiClient.updateContact(contactId, updates)
      setContacts(prev => prev.map(contact => 
        contact.id === contactId ? updatedContact : contact
      ))
      return updatedContact
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update contact')
    }
  }

  const deleteContact = async (contactId: string) => {
    try {
      await apiClient.deleteContact(contactId)
      setContacts(prev => prev.filter(contact => contact.id !== contactId))
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete contact')
    }
  }

  const refresh = () => {
    fetchContacts()
  }

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    refresh,
  }
}

export function useContact(contactId: string | null) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchContact = async () => {
    if (!contactId) {
      setContact(null)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const data = await apiClient.getContact(contactId)
      setContact(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contact'))
      setContact(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContact()
  }, [contactId])

  return {
    contact,
    isLoading,
    error,
    refresh: fetchContact,
  }
}

// Export useContacts as an alias for useClientContacts for compatibility
export const useContacts = useClientContacts