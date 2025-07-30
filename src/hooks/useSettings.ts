import useSWR from 'swr'
import { useState } from 'react'

interface Setting {
  id: string
  key: string
  value: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface GroupedSettings {
  [category: string]: {
    [key: string]: {
      id: string
      value: string
      description?: string
      updatedAt: string
    }
  }
}

interface SettingInput {
  key: string
  value: string
  description?: string
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

export function useSettings(category?: string, key?: string) {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  if (key) params.append('key', key)
  
  const queryString = params.toString()
  const url = `/api/admin/settings${queryString ? `?${queryString}` : ''}`

  const { data, error, mutate, isLoading } = useSWR<{
    data: GroupedSettings | Setting | null
    raw: Setting[]
  }>(url, fetcher)

  return {
    settings: data?.data as GroupedSettings,
    rawSettings: data?.raw || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useSettingsActions() {
  const [isLoading, setIsLoading] = useState(false)

  const createSetting = async (setting: SettingInput): Promise<Setting> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setting),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create setting')
      }

      const result = await response.json()
      return result.data
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (setting: SettingInput): Promise<Setting> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST', // Using POST for upsert behavior
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setting),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update setting')
      }

      const result = await response.json()
      return result.data
    } finally {
      setIsLoading(false)
    }
  }

  const bulkUpdateSettings = async (settings: SettingInput[]): Promise<Setting[]> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }

      const result = await response.json()
      return result.data
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSetting = async (key: string): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete setting')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions for common setting categories
  const updateEmailSettings = async (settings: {
    host?: string
    port?: number
    user?: string
    pass?: string
    from?: string
    enabled?: boolean
  }) => {
    const settingsArray: SettingInput[] = []
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsArray.push({
          key: `email.${key}`,
          value: String(value),
          description: `Email ${key} setting`,
        })
      }
    })
    
    return bulkUpdateSettings(settingsArray)
  }

  const updateSystemSettings = async (settings: {
    siteName?: string
    adminEmail?: string
    timezone?: string
    dateFormat?: string
    maintenanceMode?: boolean
  }) => {
    const settingsArray: SettingInput[] = []
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsArray.push({
          key: `system.${key}`,
          value: String(value),
          description: `System ${key} setting`,
        })
      }
    })
    
    return bulkUpdateSettings(settingsArray)
  }

  const updateRFISettings = async (settings: {
    defaultPriority?: string
    autoAssignNumbers?: boolean
    numberPrefix?: string
    reminderDays?: number
    escalationDays?: number
  }) => {
    const settingsArray: SettingInput[] = []
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsArray.push({
          key: `rfi.${key}`,
          value: String(value),
          description: `RFI ${key} setting`,
        })
      }
    })
    
    return bulkUpdateSettings(settingsArray)
  }

  const updateMailgunSettings = async (settings: {
    apiKey?: string
    domain?: string
    webhookSigningKey?: string
    replyDomain?: string
    enabled?: boolean
  }) => {
    const settingsArray: SettingInput[] = []
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsArray.push({
          key: `mailgun.${key}`,
          value: String(value),
          description: `Mailgun ${key} setting`,
        })
      }
    })
    
    return bulkUpdateSettings(settingsArray)
  }

  const updateBrevoSettings = async (settings: {
    apiKey?: string
    replyDomain?: string
    webhookSecret?: string
    enabled?: boolean
  }) => {
    const settingsArray: SettingInput[] = []
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        settingsArray.push({
          key: `brevo.${key}`,
          value: String(value),
          description: `Brevo ${key} setting`,
        })
      }
    })
    
    return bulkUpdateSettings(settingsArray)
  }

  return {
    createSetting,
    updateSetting,
    bulkUpdateSettings,
    deleteSetting,
    updateEmailSettings,
    updateSystemSettings,
    updateRFISettings,
    updateMailgunSettings,
    updateBrevoSettings,
    isLoading,
  }
}

// Helper function to get a setting value with default
export function getSettingValue(
  settings: GroupedSettings,
  category: string,
  key: string,
  defaultValue: string = ''
): string {
  return settings?.[category]?.[key]?.value || defaultValue
}

// Helper function to check if a boolean setting is enabled
export function isSettingEnabled(
  settings: GroupedSettings,
  category: string,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = getSettingValue(settings, category, key, String(defaultValue))
  return value.toLowerCase() === 'true'
}