'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthState } from '@/types'

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: undefined,
    isAuthenticated: false,
    isLoading: true,
    error: undefined,
  })
  
  const [hasMounted, setHasMounted] = useState(false)

  // Ensure hydration consistency
  useEffect(() => {
    setHasMounted(true)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        })
      } else {
        setState({
          user: undefined,
          isAuthenticated: false,
          isLoading: false,
          error: undefined,
        })
      }
    } catch (error) {
      setState({
        user: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check authentication',
      })
    }
  }

  const login = async (email: string, password: string, rememberMe = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (response.ok) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        })
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Login failed',
        }))
        throw new Error(data.error || 'Login failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        })
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Registration failed',
        }))
        throw new Error(data.error || 'Registration failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      // Continue with logout even if API call fails - silently handle API errors
    }

    setState({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
    })
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    refreshUser,
  }

  // Prevent hydration mismatch by showing loading state until mounted
  if (!hasMounted) {
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}