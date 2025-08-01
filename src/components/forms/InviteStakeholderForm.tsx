'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { apiClient } from '@/lib/api'
import { toast } from 'react-hot-toast'

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  message: z.string().optional()
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteStakeholderFormProps {
  projectId: string
  projectName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function InviteStakeholderForm({ 
  projectId, 
  projectName,
  onSuccess,
  onCancel 
}: InviteStakeholderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema)
  })

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }

      toast.success(`Invitation sent to ${data.email}`)
      reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-steel-900 mb-2">
          Invite Team Member to {projectName}
        </h3>
        <p className="text-sm text-steel-600 mb-4">
          Invite a Level 2 stakeholder to collaborate on this project. They will receive an email invitation to create their account.
        </p>
      </div>

      <div>
        <Input
          label="Name"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Enter team member's name"
        />
      </div>

      <div>
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="Enter team member's email"
        />
      </div>

      <div>
        <Textarea
          label="Personal Message (Optional)"
          {...register('message')}
          error={errors.message?.message}
          placeholder="Add a personal message to the invitation..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          Send Invitation
        </Button>
      </div>
    </form>
  )
}