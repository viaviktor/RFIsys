import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { Client, PaginatedResponse } from '@/types'

interface UseClientsOptions {
  page?: number
  limit?: number
  search?: string
  active?: boolean
}

export function useClients(options: UseClientsOptions = {}) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.getClients(
        options.page,
        options.limit,
        options.search,
        options.active
      )
      setClients(response.data)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch clients'))
    } finally {
      setIsLoading(false)
    }
  }, [options.page, options.limit, options.search, options.active])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const refetch = useCallback(() => {
    fetchClients()
  }, [fetchClients])

  return {
    clients,
    isLoading,
    error,
    pagination,
    refetch,
  }
}

export function useClient(id: string) {
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchClient = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.getClient(id)
      setClient(response)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch client'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const refetch = useCallback(() => {
    fetchClient()
  }, [fetchClient])

  return {
    client,
    isLoading,
    error,
    refetch,
  }
}

export function useCreateClient() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projects' | 'rfis' | '_count'>) => {
    try {
      setIsCreating(true)
      setError(null)
      const client = await apiClient.createClient(clientData)
      return client
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create client')
      setError(error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  return {
    createClient,
    isCreating,
    error,
  }
}

export function useUpdateClient() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      setIsUpdating(true)
      setError(null)
      const client = await apiClient.updateClient(id, updates)
      return client
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update client')
      setError(error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updateClient,
    isUpdating,
    error,
  }
}

export function useDeleteClient() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteClient = useCallback(async (id: string) => {
    try {
      setIsDeleting(true)
      setError(null)
      await apiClient.deleteClient(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete client')
      setError(error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    deleteClient,
    isDeleting,
    error,
  }
}