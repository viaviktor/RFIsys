'use client'

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { api } from '@/lib/api'
import { ProjectStakeholder } from '@/types'

export interface StakeholdersResponse {
  stakeholders: (ProjectStakeholder & {
    contact: {
      id: string
      name: string
      email: string
      phone?: string
      title?: string
      client: {
        id: string
        name: string
      }
    }
  })[]
}

export function useStakeholders(projectId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, error: swrError, isLoading: swrLoading } = useSWR<StakeholdersResponse>(
    projectId ? `/projects/${projectId}/stakeholders` : null,
    api.get,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const stakeholders = data?.stakeholders || []

  const addStakeholder = useCallback(async (contactId: string) => {
    if (!projectId) throw new Error('Project ID is required')

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post<{stakeholder: any}>(`/projects/${projectId}/stakeholders`, {
        contactId,
      })

      if (!response.stakeholder) {
        throw new Error('Failed to add stakeholder')
      }

      // Revalidate the stakeholders data
      await mutate(`/projects/${projectId}/stakeholders`)

      return response.stakeholder
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add stakeholder'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const removeStakeholder = useCallback(async (contactId: string) => {
    if (!projectId) throw new Error('Project ID is required')

    setIsLoading(true)
    setError(null)

    try {
      await api.delete(`/projects/${projectId}/stakeholders?contactId=${contactId}`)

      // Revalidate the stakeholders data
      await mutate(`/projects/${projectId}/stakeholders`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove stakeholder'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const refreshStakeholders = useCallback(() => {
    return mutate(`/projects/${projectId}/stakeholders`)
  }, [projectId])

  return {
    stakeholders,
    isLoading: swrLoading || isLoading,
    error: swrError || error,
    addStakeholder,
    removeStakeholder,
    refreshStakeholders,
  }
}