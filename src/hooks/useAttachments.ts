'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export interface Attachment {
  id: string
  filename: string
  storedName: string
  url: string
  size: number
  mimeType: string
  description?: string
  rfiId: string
  uploadedBy: string
  createdAt: string
}

export function useAttachments(rfiId: string | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAttachments = async () => {
    if (!rfiId) {
      setAttachments([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const data = await apiClient.getAttachments(rfiId)
      setAttachments(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch attachments'))
      setAttachments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [rfiId])

  const uploadAttachment = async (file: File, description?: string) => {
    if (!rfiId) throw new Error('No RFI ID provided')

    try {
      const newAttachment = await apiClient.uploadAttachment(rfiId, file, description)
      setAttachments(prev => [newAttachment, ...prev])
      return newAttachment
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to upload attachment')
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    try {
      await apiClient.deleteAttachment(attachmentId)
      setAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId))
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete attachment')
    }
  }

  const refresh = () => {
    fetchAttachments()
  }

  return {
    attachments,
    isLoading,
    error,
    uploadAttachment,
    deleteAttachment,
    refresh,
  }
}