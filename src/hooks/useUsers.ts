import useSWR from 'swr'
import { useState } from 'react'
import { User, Role, PaginatedResponse } from '@/types'

interface UseUsersOptions {
  page?: number
  limit?: number
  role?: Role
  active?: boolean
  search?: string
}

interface UserFormData {
  name: string
  email: string
  password?: string
  role: Role
  active?: boolean
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, limit = 20, role, active, search } = options
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (role) params.append('role', role)
  if (active !== undefined) params.append('active', active.toString())
  if (search) params.append('search', search)

  const { data, error, mutate, isLoading } = useSWR<PaginatedResponse<User>>(
    `/api/users?${params.toString()}`,
    fetcher
  )

  return {
    users: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useUser(id: string) {
  const { data, error, mutate, isLoading } = useSWR<{ data: User }>(
    id ? `/api/users/${id}` : null,
    fetcher
  )

  return {
    user: data?.data,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useUserActions() {
  const [isLoading, setIsLoading] = useState(false)

  const createUser = async (userData: UserFormData): Promise<User> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      const result = await response.json()
      return result.data
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (id: string, updates: Partial<UserFormData>): Promise<User> => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      const result = await response.json()
      return result.data
    } finally {
      setIsLoading(false)
    }
  }

  const deleteUser = async (id: string): Promise<{ message: string; data?: User }> => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      return await response.json()
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (id: string, newPassword: string): Promise<User> => {
    return updateUser(id, { password: newPassword })
  }

  const toggleUserStatus = async (id: string, active: boolean): Promise<User> => {
    return updateUser(id, { active })
  }

  const changeUserRole = async (id: string, role: Role): Promise<User> => {
    return updateUser(id, { role })
  }

  return {
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    toggleUserStatus,
    changeUserRole,
    isLoading,
  }
}