'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, EnvelopeIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useEmail } from '@/hooks/useEmail'
import { RFI, User, Client, Project } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  rfi: RFI & { client: Client; project: Project; createdBy: User }
  onSuccess?: () => void
}

export function EmailModal({ isOpen, onClose, rfi, onSuccess }: EmailModalProps) {
  const [recipients, setRecipients] = useState<string[]>([''])
  const [includeAttachments, setIncludeAttachments] = useState(false)
  const [includePDFAttachment, setIncludePDFAttachment] = useState(true)
  const [customMessage, setCustomMessage] = useState('')
  const { sendRFIEmail, isLoading, error, clearError } = useEmail()

  // Pre-populate with project stakeholder emails
  useEffect(() => {
    if (isOpen) {
      // Fetch stakeholders for this project and pre-populate recipients
      const fetchStakeholders = async () => {
        try {
          const response = await fetch(`/api/projects/${rfi.projectId}/stakeholders`)
          if (response.ok) {
            const data = await response.json()
            const stakeholderEmails = data.stakeholders?.map((s: any) => s.contact.email).filter(Boolean) || []
            if (stakeholderEmails.length > 0) {
              setRecipients(stakeholderEmails)
            } else {
              // Fallback to client email if no stakeholders
              setRecipients([rfi.client.email || ''])
            }
          } else {
            // Fallback to client email if API fails
            setRecipients([rfi.client.email || ''])
          }
        } catch (error) {
          console.error('Failed to fetch stakeholders:', error)
          // Fallback to client email
          setRecipients([rfi.client.email || ''])
        }
      }
      fetchStakeholders()
    }
  }, [isOpen, rfi.projectId, rfi.client.email])

  const handleAddRecipient = () => {
    setRecipients([...recipients, ''])
  }

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length> 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = value
    setRecipients(newRecipients)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    // Filter out empty recipients and validate emails
    const validRecipients = recipients.filter(email => {
      const trimmed = email.trim()
      return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    })

    if (validRecipients.length === 0) {
      return
    }

    const result = await sendRFIEmail(rfi.id, {
      recipients: validRecipients,
      includeAttachments,
      includePDFAttachment,
      customMessage: customMessage.trim() || undefined
    })

    if (result?.success) {
      onSuccess?.()
      onClose()
      // Reset form
      setRecipients([''])
      setCustomMessage('')
      setIncludeAttachments(false)
      setIncludePDFAttachment(true)
    }
  }

  const handleClose = () => {
    clearError()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-steel-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EnvelopeIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <Dialog.Title as="h3" className="text-lg font-medium text-steel-900">
                  Email RFI
                </Dialog.Title>
                <p className="text-sm text-steel-500">
                  {rfi.rfiNumber}: {rfi.title}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-steel-400 hover:text-steel-500"
           >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">
                Recipients
              </label>
              <div className="space-y-2">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="email"
                      value={recipient}
                      onChange={(e) => handleRecipientChange(index, e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1"
                      required={index === 0}
                    />
                    {recipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(index)}
                        className="p-2 text-steel-400 hover:text-safety-red"
                     >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddRecipient}
                className="mt-2 inline-flex items-center px-3 py-2 border border-steel-300 shadow-sm text-sm leading-4 font-medium rounded-md text-steel-700 bg-white hover:bg-steel-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
             >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add recipient
              </button>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="include-pdf-attachment"
                    type="checkbox"
                    checked={includePDFAttachment}
                    onChange={(e) => setIncludePDFAttachment(e.target.checked)}
                    className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-steel-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="include-pdf-attachment" className="font-medium text-steel-700">
                    Include PDF version of RFI
                  </label>
                  <p className="text-steel-500">
                    Generate and attach a PDF document of this RFI
                  </p>
                </div>
              </div>
              
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="include-file-attachments"
                    type="checkbox"
                    checked={includeAttachments}
                    onChange={(e) => setIncludeAttachments(e.target.checked)}
                    className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-steel-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="include-file-attachments" className="font-medium text-steel-700">
                    Include uploaded file attachments
                  </label>
                  <p className="text-steel-500">
                    Include any images, documents, or other files uploaded to this RFI
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label htmlFor="custom-message" className="block text-sm font-medium text-steel-700 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-steel-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="Add a custom message to include with the RFI notification..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-safety-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-safety-red-800">
                      Error sending email
                    </h3>
                    <div className="mt-2 text-sm text-safety-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Preview Info */}
            <div className="bg-steel-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-steel-900 mb-2">Email Preview</h4>
              <div className="text-sm text-steel-600 space-y-1">
                <p><strong>Subject:</strong> New RFI Created: {rfi.rfiNumber} - {rfi.title}</p>
                <p><strong>Project:</strong> {rfi.project.name}</p>
                <p><strong>Client:</strong> {rfi.client.name}</p>
                <p><strong>Created by:</strong> {rfi.createdBy.name}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-steel-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
             >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || recipients.every(r => !r.trim())}
                isLoading={isLoading}
             >
                {isLoading ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}