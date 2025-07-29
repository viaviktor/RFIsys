'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  DocumentArrowUpIcon, 
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Button } from './Button'
import { 
  processClipboardData, 
  hasClipboardImage, 
  validateClipboardImage,
  ClipboardImageResult,
  cleanupImagePreview
} from '@/lib/clipboard'

export interface FileUploadFile {
  id?: string
  file?: File
  filename: string
  size: number
  mimeType: string
  description?: string
  url?: string
  uploading?: boolean
  error?: string
  isClipboardImage?: boolean
  preview?: string
}

interface FileUploadProps {
  files: FileUploadFile[]
  onFilesChange: (files: FileUploadFile[]) => void
  onUpload?: (file: File, description?: string) => Promise<void>
  onDelete?: (fileId: string) => Promise<void>
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedFileTypes?: string[]
  disabled?: boolean
  enableClipboardPaste?: boolean
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

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

export function FileUpload({
  files,
  onFilesChange,
  onUpload,
  onDelete,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  enableClipboardPaste = true,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [pasteActive, setPasteActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileUploadFile[] = []
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      
      // Check file size
      if (file.size> maxFileSize) {
        newFiles.push({
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: `File size too large. Maximum size is ${formatFileSize(maxFileSize)}.`,
        })
        continue
      }
      
      // Check file type
      if (!acceptedFileTypes.includes(file.type)) {
        newFiles.push({
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: 'File type not allowed.',
        })
        continue
      }
      
      // Check max files limit
      if (files.length + newFiles.length>= maxFiles) {
        newFiles.push({
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: `Maximum ${maxFiles} files allowed.`,
        })
        continue
      }
      
      newFiles.push({
        file,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploading: false,
      })
    }
    
    onFilesChange([...files, ...newFiles])
  }, [files, maxFiles, maxFileSize, acceptedFileTypes, onFilesChange])

  const handleClipboardImages = useCallback(async (clipboardImages: ClipboardImageResult[]) => {
    const newFiles: FileUploadFile[] = []
    
    for (const { file, preview } of clipboardImages) {
      // Validate clipboard image
      const validation = validateClipboardImage(file, maxFileSize, acceptedFileTypes)
      
      if (!validation.valid) {
        newFiles.push({
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: validation.error,
          isClipboardImage: true,
          preview,
        })
        continue
      }
      
      // Check max files limit
      if (files.length + newFiles.length >= maxFiles) {
        newFiles.push({
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          error: `Maximum ${maxFiles} files allowed.`,
          isClipboardImage: true,
          preview,
        })
        continue
      }
      
      newFiles.push({
        file,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploading: false,
        isClipboardImage: true,
        preview,
      })
    }
    
    onFilesChange([...files, ...newFiles])
  }, [files, maxFiles, maxFileSize, acceptedFileTypes, onFilesChange])

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!enableClipboardPaste || disabled || !event.clipboardData) return
    
    // Check if we have image data
    if (!hasClipboardImage(event.clipboardData)) return
    
    // Prevent default paste behavior
    event.preventDefault()
    
    setPasteActive(true)
    
    try {
      const images = await processClipboardData(event.clipboardData)
      if (images.length > 0) {
        await handleClipboardImages(images)
      }
    } catch (error) {
      console.error('Failed to process clipboard data:', error)
    } finally {
      setPasteActive(false)
    }
  }, [enableClipboardPaste, disabled, handleClipboardImages])

  // Add clipboard event listeners
  useEffect(() => {
    if (!enableClipboardPaste || disabled) return

    const container = containerRef.current
    if (!container) return

    // Make container focusable for keyboard events
    container.setAttribute('tabIndex', '0')
    
    const handleContainerPaste = (e: Event) => handlePaste(e as ClipboardEvent)
    
    container.addEventListener('paste', handleContainerPaste)
    
    // Also listen on document for global paste
    document.addEventListener('paste', handleContainerPaste)
    
    return () => {
      container.removeEventListener('paste', handleContainerPaste)
      document.removeEventListener('paste', handleContainerPaste)
    }
  }, [enableClipboardPaste, disabled, handlePaste])

  // Cleanup previews when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview && file.isClipboardImage) {
          cleanupImagePreview(file.preview)
        }
      })
    }
  }, [])

  // Cleanup previews when files are removed
  const removeFile = useCallback((index: number) => {
    const fileToRemove = files[index]
    if (fileToRemove.preview && fileToRemove.isClipboardImage) {
      cleanupImagePreview(fileToRemove.preview)
    }
    const updatedFiles = files.filter((_, i) => i !== index)
    onFilesChange(updatedFiles)
  }, [files, onFilesChange])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    if (e.dataTransfer.files && e.dataTransfer.files.length> 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return
    
    if (e.target.files && e.target.files.length> 0) {
      handleFiles(e.target.files)
    }
  }, [disabled, handleFiles])

  const uploadFile = async (index: number, description?: string) => {
    if (!onUpload) return
    
    const file = files[index]
    if (!file.file) return
    
    const updatedFiles = [...files]
    updatedFiles[index] = { ...file, uploading: true, error: undefined }
    onFilesChange(updatedFiles)
    
    try {
      await onUpload(file.file, description)
      // Cleanup preview before removing file
      const fileToUpload = files[index]
      if (fileToUpload.preview && fileToUpload.isClipboardImage) {
        cleanupImagePreview(fileToUpload.preview)
      }
      const finalFiles = files.filter((_, i) => i !== index)
      onFilesChange(finalFiles)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updatedFiles[index] = { ...file, uploading: false, error: errorMessage }
      onFilesChange(updatedFiles)
    }
  }

  const deleteUploadedFile = async (fileId: string) => {
    if (onDelete) {
      await onDelete(fileId)
    }
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <div
        className={`file-upload-zone ${dragActive ? 'active' : ''} ${pasteActive ? 'paste-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept={acceptedFileTypes.join(',')}
          disabled={disabled}
          className="hidden"
        />
        
        <div className="space-y-3">
          {pasteActive ? (
            <ClipboardDocumentIcon className="file-upload-icon animate-pulse" />
          ) : (
            <DocumentArrowUpIcon className="file-upload-icon" />
          )}
          <div>
            <label className="cursor-pointer">
              <span className="file-upload-text">
                {pasteActive ? 'Processing clipboard image...' : 'Drop files here or click to upload'}
              </span>
            </label>
            <p className="file-upload-hint">
              Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each
            </p>
            <p className="file-upload-formats">
              Supported: Images, PDF, Word, Excel, Text files
            </p>
            {enableClipboardPaste && !disabled && (
              <p className="file-upload-paste-hint">
                💡 Tip: Press <kbd className="px-1 py-0.5 text-xs bg-steel-100 border border-steel-300 rounded">Ctrl+V</kbd> to paste screenshots
              </p>
            )}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-steel-900">Files to Upload</h4>
          {files.map((file, index) => {
            const IconComponent = getFileIcon(file.mimeType)
            
            return (
              <div key={index} className="file-item">
                <div className="file-icon">
                  {file.isClipboardImage && file.preview && !file.error ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-steel-200">
                      <img 
                        src={file.preview} 
                        alt="Clipboard image preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <IconComponent className="w-5 h-5 text-steel-500" />
                  )}
                </div>
                
                <div className="file-info">
                  <p className="file-name">
                    {file.isClipboardImage && (
                      <span className="inline-flex items-center gap-1 text-xs text-steel-500 mr-2">
                        <ClipboardDocumentIcon className="w-3 h-3" />
                        Clipboard
                      </span>
                    )}
                    {file.filename}
                  </p>
                  <p className="file-size">
                    {formatFileSize(file.size)}
                  </p>
                  {file.error && (
                    <p className="file-error">{file.error}</p>
                  )}
                </div>

                <div className="file-actions">
                  {!file.error && !file.uploading && onUpload && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => uploadFile(index)}
                      disabled={disabled}
                    >
                      Upload
                    </Button>
                  )}
                  
                  {file.uploading && (
                    <div className="file-uploading">
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                      <span className="text-xs text-steel-600">Uploading...</span>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={disabled || file.uploading}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}