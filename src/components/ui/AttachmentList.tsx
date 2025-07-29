'use client'

import { useState } from 'react'
import { 
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { Button } from './Button'
import { formatDistanceToNow } from 'date-fns'

export interface Attachment {
  id: string
  filename: string
  storedName: string
  url: string
  size: number
  mimeType: string
  description?: string
  uploadedBy: string
  createdAt: string
}

interface AttachmentListProps {
  attachments: Attachment[]
  onDelete?: (attachmentId: string) => Promise<void>
  canDelete?: (attachment: Attachment) => boolean
  showActions?: boolean
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return PhotoIcon
  }
  return DocumentIcon
}

const isImage = (mimeType: string): boolean => {
  return mimeType.startsWith('image/')
}

export function AttachmentList({
  attachments,
  onDelete,
  canDelete,
  showActions = true,
}: AttachmentListProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleDelete = async (attachmentId: string) => {
    if (!onDelete) return
    
    setDeletingIds(prev => new Set(prev).add(attachmentId))
    try {
      await onDelete(attachmentId)
    } catch (error) {
      // Could show a toast notification or set an error state in the future
      // For now, silently handle the error - the UI will show the file still exists
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(attachmentId)
        return newSet
      })
    }
  }

  const handleView = (attachment: Attachment) => {
    window.open(`/api/uploads/${attachment.storedName}`, '_blank')
  }

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a')
    link.href = `/api/uploads/${attachment.storedName}`
    link.download = attachment.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentIcon className="w-12 h-12 text-steel-400 mx-auto mb-3" />
        <p className="text-steel-500">No attachments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => {
        const IconComponent = getFileIcon(attachment.mimeType)
        const isDeleting = deletingIds.has(attachment.id)
        const canDeleteFile = canDelete ? canDelete(attachment) : true
        
        return (
          <div key={attachment.id} className="flex items-start gap-3 p-3 bg-steel-50 rounded-lg border border-steel-200">
            <div className="flex-shrink-0">
              {isImage(attachment.mimeType) ? (
                <div className="relative">
                  <img
                    src={`/api/uploads/${attachment.storedName}`}
                    alt={attachment.filename}
                    className="w-12 h-12 object-cover rounded border border-steel-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  <PhotoIcon className="w-12 h-12 text-steel-400 hidden" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-white rounded border border-steel-200 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-steel-500" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-steel-900 truncate">
                  {attachment.filename}
                </h4>
                <span className="text-xs text-steel-500 ml-2 flex-shrink-0">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              
              {attachment.description && (
                <p className="text-xs text-steel-600 mb-2">
                  {attachment.description}
                </p>
              )}
              
              <p className="text-xs text-steel-500">
                Uploaded {formatDistanceToNow(new Date(attachment.createdAt))} ago
              </p>
            </div>

            {showActions && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(attachment)}
                  title="View file"
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  title="Download file"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </Button>
                
                {onDelete && canDeleteFile && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={isDeleting}
                    title="Delete file"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}