'use client'

import { useState, useEffect } from 'react'
import { Contact } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  title: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ContactFormData) => Promise<void>
  contact?: Contact | null
  title?: string
  clientName?: string
}

export function ContactModal({
  isOpen,
  onClose,
  onSubmit,
  contact,
  title,
  clientName,
}: ContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!contact

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      title: '',
    },
  })

  // Reset form when contact changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        reset({
          name: contact.name,
          email: contact.email,
          phone: contact.phone || '',
          title: contact.title || '',
        })
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          title: '',
        })
      }
    }
  }, [isOpen, contact, reset])

  const handleFormSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to save contact',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-steel-900 bg-opacity-75" onClick={handleClose}>
      <div 
        className="modal-content w-full max-w-lg" 
        onClick={(e) => e.stopPropagation()}
      >
          <div className="modal-header">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="modal-title">
                  {title || (isEditing ? 'Edit Contact' : 'Add Contact')}
                </h3>
                {clientName && (
                  <p className="text-sm text-steel-600 mt-1">
                    for {clientName}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="modal-close"
             >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="modal-body">
            <form id="contact-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {errors.root && (
                <div className="alert-error">
                  <div className="font-medium">
                    {errors.root.message}
                  </div>
                </div>
              )}

              <Input
                label="Full Name"
                placeholder="Enter contact name"
                required
                {...register('name')}
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                type="email"
                label="Email Address"
                placeholder="Enter email address"
                required
                {...register('email')}
                error={errors.email?.message}
                disabled={isSubmitting}
              />

              <Input
                type="tel"
                label="Phone Number"
                placeholder="Enter phone number (optional)"
                {...register('phone')}
                error={errors.phone?.message}
                disabled={isSubmitting}
              />

              <Input
                label="Job Title"
                placeholder="Enter job title or role (optional)"
                {...register('title')}
                error={errors.title?.message}
                disabled={isSubmitting}
              />

            </form>
          </div>

          <div className="modal-footer">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
             >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                form="contact-form"
             >
                {isSubmitting 
                  ? (isEditing ? 'Updating...' : 'Adding...')
                  : (isEditing ? 'Update Contact' : 'Add Contact')
                }
              </Button>
            </div>
          </div>
      </div>
    </div>
  )
}