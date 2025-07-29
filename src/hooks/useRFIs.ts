import useSWR from 'swr'
import { RFI, RFIFilters, RFISort, PaginatedResponse } from '@/types'
import { apiClient } from '@/lib/api'

interface UseRFIsOptions {
  page?: number
  limit?: number
  filters?: RFIFilters
  sort?: RFISort
  refreshInterval?: number
}

export function useRFIs(options: UseRFIsOptions = {}) {
  const {
    page = 1,
    limit = 10,
    filters,
    sort,
    refreshInterval = 0, // Disable by default, enable per component
  } = options

  // Create a cache key that includes all parameters
  const cacheKey = [
    'rfis',
    page,
    limit,
    filters ? JSON.stringify(filters) : null,
    sort ? JSON.stringify(sort) : null,
  ].filter(Boolean).join(':')

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PaginatedResponse<RFI>>(
    cacheKey,
    () => apiClient.getRFIs(page, limit, filters, sort),
    {
      refreshInterval,
      // Global config will handle error retry and revalidation
    }
  )

  return {
    rfis: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  }
}

export function useRFI(id: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<RFI>(
    id ? `rfi:${id}` : null,
    id ? () => apiClient.getRFI(id) : null,
    {
      refreshInterval: 0, // Disable auto refresh for individual RFI
      // Global config will handle error retry and revalidation
    }
  )

  return {
    rfi: data,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  }
}

// Hook for creating RFIs with optimistic updates
export function useCreateRFI() {
  const createRFI = async (rfiData: Omit<RFI, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'status' | 'rfiNumber' | 'client' | 'project' | 'createdBy' | 'responses' | 'attachments' | 'emailLogs' | '_count'>) => {
    try {
      const newRFI = await apiClient.createRFI(rfiData)
      
      // Invalidate the RFIs cache to trigger a refresh
      // This will update all useRFIs hooks
      const { mutate } = await import('swr')
      mutate((key) => typeof key === 'string' && key.startsWith('rfis'))
      
      return newRFI
    } catch (error) {
      throw error
    }
  }

  return { createRFI }
}

// Hook for updating RFIs with optimistic updates
export function useUpdateRFI() {
  const updateRFI = async (id: string, updates: Partial<RFI>) => {
    try {
      const updatedRFI = await apiClient.updateRFI(id, updates)
      
      // Update the individual RFI cache
      const { mutate } = await import('swr')
      mutate(`rfi:${id}`, updatedRFI, false)
      
      // Invalidate the RFIs list cache
      mutate((key) => typeof key === 'string' && key.startsWith('rfis'))
      
      return updatedRFI
    } catch (error) {
      throw error
    }
  }

  return { updateRFI }
}

// Hook for deleting RFIs
export function useDeleteRFI() {
  const deleteRFI = async (id: string) => {
    try {
      await apiClient.deleteRFI(id)
      
      // Remove from individual cache
      const { mutate } = await import('swr')
      mutate(`rfi:${id}`, undefined, false)
      
      // Invalidate the RFIs list cache
      mutate((key) => typeof key === 'string' && key.startsWith('rfis'))
      
    } catch (error) {
      throw error
    }
  }

  return { deleteRFI }
}