import { useState } from 'react'

interface EmailRFIRequest {
  recipients: string[]
  includeAttachments?: boolean
  includePDFAttachment?: boolean
  customMessage?: string
}

interface EmailResponse {
  success: boolean
  message: string
  recipients?: number
}

export function useEmail() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendRFIEmail = async (rfiId: string, data: EmailRFIRequest): Promise<EmailResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/rfis/${rfiId}/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send email'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestEmail = async (email: string): Promise<EmailResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test email')
      }

      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send test email'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    sendRFIEmail,
    sendTestEmail,
    isLoading,
    error,
    clearError: () => setError(null)
  }
}