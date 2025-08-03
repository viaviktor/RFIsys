'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useCreateRFI } from '@/hooks/useRFIs'
import { useEmail } from '@/hooks/useEmail'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ClientProjectSelect } from '@/components/forms/ClientProjectSelect'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rfiSchema, type RFIFormData } from '@/lib/validations'
import { Priority, RFIUrgency, RFIDirection } from '@/types'
import { FileUpload, type FileUploadFile } from '@/components/ui/FileUpload'
import Link from 'next/link'

function NewRFIPageContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createRFI } = useCreateRFI()
  const { sendRFIEmail } = useEmail()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<FileUploadFile[]>([])
  const [createdRFIId, setCreatedRFIId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Get URL parameters for pre-filling using Next.js useSearchParams
  const preFilledValues = {
    projectId: searchParams.get('projectId'),
    clientId: searchParams.get('clientId')
  }
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    setError,
  } = useForm<RFIFormData>({
    resolver: zodResolver(rfiSchema),
    defaultValues: {
      priority: 'MEDIUM',
      urgency: 'NORMAL',
      direction: 'OUTGOING',
    },
  })

  const watchedValues = watch()
  

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Auto-save draft functionality
  useEffect(() => {
    if (!isDirty) return

    const timer = setTimeout(() => {
      const draftData = {
        ...watchedValues,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem('rfi-draft', JSON.stringify(draftData))
      setIsDraft(true)
      
      // Clear draft indicator after 2 seconds
      setTimeout(() => setIsDraft(false), 2000)
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(timer)
  }, [watchedValues, isDirty])

  // Load draft on mount and handle URL parameters
  useEffect(() => {
    // Load draft first if available
    const savedDraft = localStorage.getItem('rfi-draft')
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft)
        // Only load if draft is less than 24 hours old
        const draftAge = new Date().getTime() - new Date(draftData.timestamp).getTime()
        if (draftAge < 24 * 60 * 60 * 1000) {
          Object.keys(draftData).forEach((key) => {
            if (key !== 'timestamp') {
              setValue(key as keyof RFIFormData, draftData[key])
            }
          })
        } else {
          localStorage.removeItem('rfi-draft')
        }
      } catch (error) {
        localStorage.removeItem('rfi-draft')
      }
    }

    // Pre-fill from URL parameters (these take precedence over draft)
    if (preFilledValues.clientId) {
      setValue('clientId', preFilledValues.clientId)
    }
  }, [setValue, preFilledValues.clientId])

  // Separate effect for project ID that runs after client is set - with delay
  useEffect(() => {
    if (preFilledValues.projectId && preFilledValues.clientId && watchedValues.clientId === preFilledValues.clientId) {
      // Add a small delay to ensure projects have loaded
      const timer = setTimeout(() => {
        setValue('projectId', preFilledValues.projectId!)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [setValue, preFilledValues.projectId, preFilledValues.clientId, watchedValues.clientId])

  const onSubmit = async (data: RFIFormData, sendEmail: boolean = true) => {
    if (sendEmail) {
      setIsSubmitting(true)
    } else {
      setIsSavingDraft(true)
    }
    
    try {
      // First create the RFI (as DRAFT if not sending email)
      const newRFI = await createRFI({
        title: data.title,
        description: data.description,
        suggestedSolution: data.suggestedSolution,
        priority: data.priority,
        urgency: data.urgency || 'NORMAL',
        direction: data.direction || 'OUTGOING',
        dateNeededBy: data.dateNeededBy || undefined,
        clientId: data.clientId,
        projectId: data.projectId,
        // Status will be DRAFT by default in the API
      })
      
      setCreatedRFIId(newRFI.id)
      
      // Upload any pending files
      if (pendingFiles.length> 0) {
        const filesWithoutErrors = pendingFiles.filter(f => !f.error && f.file)
        
        for (const fileData of filesWithoutErrors) {
          if (fileData.file) {
            try {
              await apiClient.uploadAttachment(newRFI.id, fileData.file, fileData.description)
            } catch (uploadError) {
              // Continue with other files even if one fails
            }
          }
        }
      }
      
      // Clear draft after successful submission
      localStorage.removeItem('rfi-draft')
      
      // Send email notification only if requested
      if (sendEmail && newRFI.client?.email) {
        // Update status to OPEN when sending
        await apiClient.updateRFI(newRFI.id, { status: 'OPEN' })
        
        // Send email notification in background (don't block navigation)
        sendRFIEmail(newRFI.id, {
          recipients: [newRFI.client.email],
          includeAttachments: true // Include PDF attachment when sending
        }).then((result) => {
          // Silently handle email notification results
        }).catch((emailError) => {
          // Email errors don't affect RFI creation success
        })
      }
      
      // Navigate immediately after RFI creation
      await router.push(`/dashboard/rfis/${newRFI.id}`)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create RFI',
      })
    } finally {
      setIsSubmitting(false)
      setIsSavingDraft(false)
    }
  }

  const handleSaveDraft = () => {
    handleSubmit((data) => onSubmit(data, false))()
  }

  const handleCreateAndSend = () => {
    handleSubmit((data) => onSubmit(data, true))()
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    
    // Navigate back to the appropriate place based on where they came from
    if (preFilledValues.projectId) {
      router.push(`/dashboard/projects/${preFilledValues.projectId}`)
    } else if (preFilledValues.clientId) {
      router.push(`/dashboard/clients/${preFilledValues.clientId}`)
    } else {
      router.push('/dashboard')
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link 
                href={
                  preFilledValues.projectId 
                    ? `/dashboard/projects/${preFilledValues.projectId}`
                    : preFilledValues.clientId
                    ? `/dashboard/clients/${preFilledValues.clientId}`
                    : '/dashboard'
                }
              >
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  {preFilledValues.projectId 
                    ? 'Back to Project'
                    : preFilledValues.clientId
                    ? 'Back to Client'
                    : 'Back to Dashboard'
                  }
                </Button>
              </Link>

              {isDraft && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Draft saved
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">
              Create New RFI
            </h1>
            <p className="text-steel-600 font-medium">
              Request information for your construction project
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowLeftIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-steel-900">Create New RFI</h2>
                <p className="text-steel-600">
                  Request information for your construction project
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <form className="space-y-8">
              {/* Form Errors */}
              {errors.root && (
                <div className="alert-error">
                  <div className="font-medium">
                    {errors.root.message}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Basic Information
                </h3>
                
                <div className="space-y-6">
                  <Input
                    label="Title"
                    placeholder="Brief description of the RFI topic"
                    required
                    {...register('title')}
                    error={errors.title?.message}
                  />

                  <div className="input-group">
                    <label className="input-label">
                      Description <span className="text-safety-red">*</span>
                    </label>
                    <textarea
                      rows={4}
                      className={`input ${errors.description ? 'input-error' : ''}`}
                      placeholder="Detailed description of the information request..."
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="input-error-text">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Suggested Solution
                    </label>
                    <textarea
                      rows={3}
                      className={`input ${errors.suggestedSolution ? 'input-error' : ''}`}
                      placeholder="Your proposed solution or recommendation (optional)..."
                      {...register('suggestedSolution')}
                    />
                    {errors.suggestedSolution && (
                      <p className="input-error-text">{errors.suggestedSolution.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Client and Project */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                    Client & Project
                  </h3>
                  {(preFilledValues.projectId || preFilledValues.clientId) && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Pre-filled from project
                    </span>
                  )}
                </div>
                
                <ClientProjectSelect
                  selectedClientId={watchedValues.clientId}
                  selectedProjectId={watchedValues.projectId}
                  onClientChange={(clientId) => setValue('clientId', clientId)}
                  onProjectChange={(projectId) => setValue('projectId', projectId)}
                  clientError={errors.clientId?.message}
                  projectError={errors.projectId?.message}
                  required
                />
                
                {(preFilledValues.projectId || preFilledValues.clientId) && (
                  <p className="text-sm text-steel-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    Client and project information has been automatically filled based on the project you came from. You can change these if needed.
                  </p>
                )}
              </div>

              {/* RFI Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  RFI Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select
                    label="Priority"
                    required
                    {...register('priority')}
                    error={errors.priority?.message}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                  
                  <Select
                    label="Urgency"
                    {...register('urgency')}
                    error={errors.urgency?.message}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="ASAP">ASAP</option>
                  </Select>

                  <Select
                    label="Direction"
                    {...register('direction')}
                    error={errors.direction?.message}
                  >
                    <option value="OUTGOING">Outgoing (To Client)</option>
                    <option value="INCOMING">Incoming (From Client)</option>
                  </Select>
                </div>
                
                <div className="mt-6">
                  <Input
                    type="date"
                    label="Date Needed By"
                    {...register('dateNeededBy')}
                    error={errors.dateNeededBy?.message}
                    helperText="When do you need a response?"
                  />
                </div>
              </div>

              {/* File Attachments */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  File Attachments
                </h3>
                <p className="text-sm text-steel-600">
                  Attach relevant documents, images, or files to support your RFI.
                </p>
                
                <FileUpload
                  files={pendingFiles}
                  onFilesChange={setPendingFiles}
                  maxFiles={10}
                  disabled={isSubmitting}
                />
              </div>


              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-steel-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting || isSavingDraft}
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || isSavingDraft}
                  >
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCreateAndSend}
                    disabled={isSubmitting || isSavingDraft}
                  >
                    {isSubmitting ? 'Creating...' : 'Create and Send'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function NewRFIPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </DashboardLayout>
    }>
      <NewRFIPageContent />
    </Suspense>
  )
}