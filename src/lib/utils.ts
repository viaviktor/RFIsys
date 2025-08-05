
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Parse deletion error response and return user-friendly message
export function parseDeletionError(error: any): string {
  if (error?.response?.status === 409) {
    // Dependency conflict error
    const data = error.response.data
    if (data?.message) {
      return data.message
    }
    if (data?.error && data.error.includes('dependencies')) {
      return data.error
    }
  }
  
  if (error?.response?.status === 403) {
    return 'You do not have permission to delete this item.'
  }
  
  if (error?.response?.status === 404) {
    return 'Item not found or already deleted.'
  }
  
  // Generic error fallback
  return error?.message || 'An unexpected error occurred during deletion.'
}