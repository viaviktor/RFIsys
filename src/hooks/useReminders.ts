import useSWR from 'swr'

export interface ReminderSummary {
  dueTomorrow: number
  overdue: number
  timestamp: string
}

export interface ReminderProcessingResult {
  dueTomorrowReminders: {
    count: number
    success: number
    failed: number
    rfis: string[]
  }
  overdueReminders: {
    count: number
    success: number
    failed: number
    rfis: string[]
  }
}

// Simple fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export function useReminderSummary() {
  const { data, error, isLoading, mutate } = useSWR<ReminderSummary>(
    '/api/rfis/reminders',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  return {
    summary: data,
    isLoading,
    error,
    refresh: mutate
  }
}

export function useReminderActions() {
  const sendReminder = async (rfiId: string, type: 'due_tomorrow' | 'overdue') => {
    try {
      const response = await fetch('/api/rfis/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          rfiId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reminder')
      }

      return await response.json()
    } catch (error) {
      console.error('Error sending reminder:', error)
      throw error
    }
  }

  const processAllReminders = async (): Promise<ReminderProcessingResult> => {
    try {
      const response = await fetch('/api/rfis/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'process_all'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process reminders')
      }

      return await response.json()
    } catch (error) {
      console.error('Error processing all reminders:', error)
      throw error
    }
  }

  const testReminderSystem = async () => {
    try {
      const response = await fetch('/api/admin/reminders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to test reminder system')
      }

      return await response.json()
    } catch (error) {
      console.error('Error testing reminder system:', error)
      throw error
    }
  }

  return {
    sendReminder,
    processAllReminders,
    testReminderSystem
  }
}