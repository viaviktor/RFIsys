import useSWR from 'swr'
import { apiClient } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface Invitation {
  id: string
  contact: {
    id: string
    name: string
    email: string
    isRegistered: boolean
  }
  project: {
    id: string
    name: string
    projectNumber?: string
  }
  invitedAt: string
}

interface InvitationsResponse {
  invitations: Invitation[]
  total: number
}

interface InviteData {
  email: string
  name: string
  projectId: string
  message?: string
}

export function useInvitations(projectId?: string) {
  const key = projectId 
    ? `/api/invitations?projectId=${projectId}`
    : '/api/invitations'

  const { data, error, isLoading, mutate } = useSWR<InvitationsResponse>(
    key,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }
      return response.json()
    }
  )

  const sendInvitation = async (inviteData: InviteData) => {
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }

      // Refresh the invitations list
      mutate()

      toast.success(`Invitation sent to ${inviteData.email}`)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      toast.error(message)
      throw error
    }
  }

  return {
    invitations: data?.invitations || [],
    total: data?.total || 0,
    isLoading,
    error,
    sendInvitation,
    refresh: mutate
  }
}