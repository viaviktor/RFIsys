import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { Project, PaginatedResponse } from '@/types'

interface UseProjectsOptions {
  page?: number
  limit?: number
  clientId?: string
  status?: string
  managerId?: string
  search?: string
  active?: boolean
}

export function useProjects(options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.getProjects(
        options.page,
        options.limit,
        options.clientId,
        options.status,
        options.managerId,
        options.search,
        options.active
      )
      setProjects(response.data)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'))
    } finally {
      setIsLoading(false)
    }
  }, [options.page, options.limit, options.clientId, options.status, options.managerId, options.search, options.active])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const refetch = useCallback(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    isLoading,
    error,
    pagination,
    refetch,
  }
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProject = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.getProject(id)
      setProject(response)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const refetch = useCallback(() => {
    fetchProject()
  }, [fetchProject])

  return {
    project,
    isLoading,
    error,
    refetch,
  }
}

export function useCreateProject() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'manager' | 'rfis' | '_count'>) => {
    try {
      setIsCreating(true)
      setError(null)
      const project = await apiClient.createProject(projectData)
      
      // Force immediate revalidation of all project lists
      const { mutate } = await import('swr')
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('projects'),
        undefined,
        { revalidate: true }
      )
      
      return project
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create project')
      setError(error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  return {
    createProject,
    isCreating,
    error,
  }
}

export function useUpdateProject() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      setIsUpdating(true)
      setError(null)
      const project = await apiClient.updateProject(id, updates)
      
      // Force immediate revalidation after successful update
      const { mutate } = await import('swr')
      mutate(`project:${id}`, project, false)
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('projects'),
        undefined,
        { revalidate: true }
      )
      
      return project
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update project')
      setError(error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updateProject,
    isUpdating,
    error,
  }
}

export function useDeleteProject() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteProject = useCallback(async (id: string) => {
    try {
      setIsDeleting(true)
      setError(null)
      await apiClient.deleteProject(id)
      
      // Force immediate revalidation after successful delete
      const { mutate } = await import('swr')
      mutate(`project:${id}`, undefined, false)
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('projects'),
        undefined,
        { revalidate: true }
      )
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete project')
      setError(error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    deleteProject,
    isDeleting,
    error,
  }
}

export function useArchiveProject() {
  const [isArchiving, setIsArchiving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const archiveProject = useCallback(async (id: string) => {
    try {
      setIsArchiving(true)
      setError(null)
      const project = await apiClient.archiveProject(id)
      
      // Force immediate revalidation after successful archive
      const { mutate } = await import('swr')
      mutate(`project:${id}`, project, false)
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('projects'),
        undefined,
        { revalidate: true }
      )
      
      return project
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to archive project')
      setError(error)
      throw error
    } finally {
      setIsArchiving(false)
    }
  }, [])

  return {
    archiveProject,
    isArchiving,
    error,
  }
}

export function useUnarchiveProject() {
  const [isUnarchiving, setIsUnarchiving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const unarchiveProject = useCallback(async (id: string) => {
    try {
      setIsUnarchiving(true)
      setError(null)
      const project = await apiClient.unarchiveProject(id)
      
      // Force immediate revalidation after successful unarchive
      const { mutate } = await import('swr')
      mutate(`project:${id}`, project, false)
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('projects'),
        undefined,
        { revalidate: true }
      )
      
      return project
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unarchive project')
      setError(error)
      throw error
    } finally {
      setIsUnarchiving(false)
    }
  }, [])

  return {
    unarchiveProject,
    isUnarchiving,
    error,
  }
}