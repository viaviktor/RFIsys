import useSWR from 'swr'
import { Response, PaginatedResponse } from '@/types'
import { apiClient } from '@/lib/api'

interface UseResponsesOptions {
  page?: number
  limit?: number
  refreshInterval?: number
}

export function useResponses(rfiId: string | null, options: UseResponsesOptions = {}) {
  const {
    page = 1,
    limit = 20,
    refreshInterval = 5000, // 5 seconds for real-time feel
  } = options

  const cacheKey = rfiId ? `responses:${rfiId}:${page}:${limit}` : null

  const fetcher = async () => {
    if (!rfiId) throw new Error('No RFI ID provided')
    return apiClient.getRFIResponses(rfiId, page, limit)
  }

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PaginatedResponse<Response>>(
    cacheKey,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  )

  return {
    responses: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: () => mutate(),
  }
}

// Hook for creating responses with optimistic updates
export function useCreateResponse() {
  const createResponse = async (rfiId: string, content: string) => {
    try {
      const newResponse = await apiClient.createResponse(rfiId, content)
      
      // Invalidate responses cache for this RFI
      const { mutate } = await import('swr')
      mutate((key) => typeof key === 'string' && key.startsWith(`responses:${rfiId}`))
      
      // Also invalidate the RFI cache to update response count
      mutate(`rfi:${rfiId}`)
      
      return newResponse
    } catch (error) {
      throw error
    }
  }

  return { createResponse }
}

// Hook for optimistic response creation (shows response immediately)
export function useOptimisticResponse() {
  const addOptimisticResponse = async (
    rfiId: string,
    content: string,
    author: { id: string; name: string; email: string }
  ) => {
    const { mutate } = await import('swr')
    const cacheKey = `responses:${rfiId}:1:20` // Assuming first page
    
    // Create optimistic response
    const optimisticResponse: Response = {
      id: `temp-${Date.now()}`,
      content,
      rfiId,
      authorId: author.id,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        role: 'USER',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Optimistically update the cache
    mutate(
      cacheKey,
      (current: PaginatedResponse<Response> | undefined) => {
        if (!current) return current
        return {
          ...current,
          data: [optimisticResponse, ...current.data],
        }
      },
      false // Don't revalidate immediately
    )

    try {
      // Make the actual API call
      const actualResponse = await apiClient.createResponse(rfiId, content)
      
      // Update with real response
      mutate(
        cacheKey,
        (current: PaginatedResponse<Response> | undefined) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.map(r => 
              r.id === optimisticResponse.id ? actualResponse : r
            ),
          }
        },
        false
      )
      
      return actualResponse
    } catch (error) {
      // Remove optimistic response on error
      mutate(
        cacheKey,
        (current: PaginatedResponse<Response> | undefined) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.filter(r => r.id !== optimisticResponse.id),
          }
        },
        false
      )
      throw error
    }
  }

  return { addOptimisticResponse }
}