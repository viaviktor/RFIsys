import useSWR from 'swr'
import { toast } from 'react-hot-toast'

interface AccessRequest {
  id: string
  contactId: string
  projectId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'
  requestedRole: string
  justification?: string
  autoApprovalReason?: string
  createdAt: string
  processedAt?: string
  processedById?: string
  contact?: {
    id: string
    name: string
    email: string
    title?: string
    client?: {
      id: string
      name: string
    }
  }
  project?: {
    id: string
    name: string
  }
  processedBy?: {
    id: string
    name: string
  }
  currentlyHasAccess?: boolean // Whether the user currently has stakeholder access to the project
}

export function useAccessRequests() {
  const { data, error, isLoading, mutate } = useSWR<AccessRequest[]>(
    '/api/access-requests',
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch access requests')
      }
      return response.json()
    }
  )

  const updateAccessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/access-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update access request')
      }

      // Refresh the list
      mutate()

      return await response.json()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update access request'
      toast.error(message)
      throw error
    }
  }

  return {
    accessRequests: data || [],
    isLoading,
    error,
    updateAccessRequest,
    refresh: mutate
  }
}