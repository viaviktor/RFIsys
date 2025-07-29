/**
 * Clipboard utilities for handling image paste operations
 */

export interface ClipboardImageResult {
  file: File
  preview: string
}

/**
 * Generate a filename for a clipboard image
 */
export function generateClipboardFilename(mimeType: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
  const date = timestamp[0]
  const time = timestamp[1].split('-').slice(0, 3).join('')
  
  let extension = 'png'
  if (mimeType === 'image/jpeg') extension = 'jpg'
  else if (mimeType === 'image/gif') extension = 'gif'
  else if (mimeType === 'image/webp') extension = 'webp'
  
  return `screenshot-${date}-${time}.${extension}`
}

/**
 * Convert clipboard data to File objects
 */
export async function processClipboardData(clipboardData: DataTransfer): Promise<ClipboardImageResult[]> {
  const results: ClipboardImageResult[] = []
  const items = Array.from(clipboardData.items)
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (blob) {
        const filename = generateClipboardFilename(blob.type)
        const file = new File([blob], filename, { type: blob.type })
        const preview = URL.createObjectURL(blob)
        
        results.push({ file, preview })
      }
    }
  }
  
  return results
}

/**
 * Check if clipboard contains image data
 */
export function hasClipboardImage(clipboardData: DataTransfer): boolean {
  return Array.from(clipboardData.items).some(item => item.type.startsWith('image/'))
}

/**
 * Validate clipboard image file
 */
export function validateClipboardImage(
  file: File, 
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`
    }
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Image format not supported.'
    }
  }
  
  return { valid: true }
}

/**
 * Hook to handle clipboard paste events
 */
export function useClipboardPaste(
  onPaste: (images: ClipboardImageResult[]) => void,
  enabled: boolean = true
) {
  const handlePaste = async (event: ClipboardEvent) => {
    if (!enabled || !event.clipboardData) return
    
    // Check if we have image data
    if (!hasClipboardImage(event.clipboardData)) return
    
    // Prevent default paste behavior
    event.preventDefault()
    
    try {
      const images = await processClipboardData(event.clipboardData)
      if (images.length > 0) {
        onPaste(images)
      }
    } catch (error) {
      console.error('Failed to process clipboard data:', error)
    }
  }
  
  return { handlePaste }
}

/**
 * Create a data URL from a File for preview purposes
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function cleanupImagePreview(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}