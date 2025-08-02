'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFI } from '@/hooks/useRFIs'
import { useResponses, useCreateResponse } from '@/hooks/useResponses'
import { useAttachments } from '@/hooks/useAttachments'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { AttachmentList } from '@/components/ui/AttachmentList'
import { FileUpload, type FileUploadFile } from '@/components/ui/FileUpload'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ArrowLeftIcon, PaperAirplaneIcon, DocumentArrowDownIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { apiClient, downloadFile } from '@/lib/api'
import { formatDistanceToNow, format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RFI, Client, Project, User, RFIStatus, STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { EmailModal } from '@/components/email/EmailModal'
import { SmartNav } from '@/components/ui/ContextualNav'
import { ClientLink, ProjectLink, UserLink } from '@/components/ui/EntityLinks'
import { QuickNav } from '@/components/ui/EntityLinks'

const responseSchema = z.object({
  content: z.string().min(1, 'Response content is required'),
})

type ResponseForm = z.infer<typeof responseSchema>

export default function RFIDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const rfiId = params.id as string
  
  const { rfi, isLoading: rfiLoading, error: rfiError } = useRFI(rfiId)
  const { responses, isLoading: responsesLoading } = useResponses(rfiId)
  const { createResponse } = useCreateResponse()
  const { attachments, isLoading: attachmentsLoading, uploadAttachment, deleteAttachment } = useAttachments(rfiId)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<FileUploadFile[]>([])
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResponseForm>({
    resolver: zodResolver(responseSchema),
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const onSubmitResponse = async (data: ResponseForm) => {
    if (!rfiId) return
    
    setIsSubmitting(true)
    try {
      await createResponse(rfiId, data.content)
      reset()
    } catch (error) {
      console.error('Failed to create response:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (file: File, description?: string) => {
    try {
      await uploadAttachment(file, description)
    } catch (error) {
      console.error('Failed to upload file:', error)
      throw error
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId)
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      throw error
    }
  }

  const handleGeneratePDF = async () => {
    if (!rfi) return
    
    setIsGeneratingPDF(true)
    try {
      const pdfBlob = await apiClient.generateRFIPDF(rfi.id)
      downloadFile(pdfBlob, `RFI-${rfi.rfiNumber}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      // You could add a toast notification here
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleStatusChange = async (newStatus: RFIStatus) => {
    if (!rfi || newStatus === rfi.status) return
    
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/rfis/${rfi.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh the page data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (authLoading || rfiLoading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-steel-600">Loading RFI details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (rfiError) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Error</h2>
              <p className="text-steel-600 mb-6">Failed to load RFI: {rfiError.message}</p>
              <Link href="/dashboard/rfis">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to RFIs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!rfi) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">RFI Not Found</h2>
              <p className="text-steel-600 mb-6">The requested RFI could not be found.</p>
              <Link href="/dashboard/rfis">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to RFIs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Smart Navigation Header */}
      <SmartNav 
        entityType="rfi"
        entityId={rfiId}
        entityData={rfi}
        onSendEmail={() => setIsEmailModalOpen(true)}
        onGeneratePDF={handleGeneratePDF}
      />
      
      <div className="page-container">
        {/* Quick Navigation Links */}
        {rfi && (
          <QuickNav 
            items={[
              {
                type: 'project',
                id: rfi.projectId,
                label: rfi.project?.name || 'Project'
              },
              {
                type: 'client',
                id: rfi.clientId,
                label: rfi.client?.name || 'Client'
              },
              {
                type: 'user',
                id: rfi.createdById,
                label: `Created by ${rfi.createdBy?.name || 'User'}`
              }
            ]}
            title="Related Entities"
            className="mb-6"
          />
        )}

        {/* Legacy Page Header - keeping for now */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/dashboard/rfis">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  Back to RFIs
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">
              RFI Details
            </h1>
            <p className="text-steel-600 font-medium">
              {rfi.rfiNumber} - {rfi.title}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - RFI Details */}
          <div className="xl:col-span-2 space-y-6">
            {/* RFI Header Card */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-steel-900 mb-2">
                      <span className="text-orange-600 font-mono">{rfi.rfiNumber}</span>
                    </h2>
                    <h3 className="text-xl font-semibold text-steel-900 mb-3">{rfi.title}</h3>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={rfi.priority} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="prose prose-steel max-w-none">
                  <p className="text-steel-700 leading-relaxed">{rfi.description}</p>
                </div>
              </div>
            </div>

            {/* Responses Section */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">
                  Responses ({responses.length})
                </h3>
              </div>
              
              <div className="card-body">
                {responsesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-steel-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-steel-200 rounded w-1/4"></div>
                            <div className="h-3 bg-steel-200 rounded w-3/4"></div>
                            <div className="h-3 bg-steel-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : responses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-steel-500">No responses yet. Be the first to respond!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {responses.map((response) => (
                      <div key={response.id} className="border-b border-steel-100 last:border-b-0 pb-6 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-orange-600">
                              {response.author?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {response.author ? (
                                <UserLink 
                                  userId={response.author.id}
                                  userName={response.author.name}
                                  className="text-sm font-semibold"
                                >
                                  {response.author.name}
                                </UserLink>
                              ) : (
                                <p className="text-sm font-semibold text-steel-900">
                                  Unknown User
                                </p>
                              )}
                              <p className="text-xs text-steel-500">
                                {formatDistanceToNow(new Date(response.createdAt))} ago
                              </p>
                            </div>
                            <div className="prose prose-sm prose-steel max-w-none">
                              <p className="text-steel-700 whitespace-pre-wrap">
                                {response.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Response Form */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Add Response</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit(onSubmitResponse)} className="space-y-4">
                  <div>
                    <textarea
                      {...register('content')}
                      placeholder="Add your response..."
                      rows={4}
                      className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    />
                    {errors.content && (
                      <p className="mt-1 text-sm text-safety-red">{errors.content.message}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                      leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
                    >
                      Send Response
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* RFI Info Card */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">RFI Information</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <p className="text-sm font-medium text-steel-600 mb-1">Status</p>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={rfi.status} />
                    <Select
                      value={rfi.status}
                      onChange={(e) => handleStatusChange(e.target.value as RFIStatus)}
                      disabled={isUpdatingStatus}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-steel-600 mb-1">Created by</p>
                  {rfi.createdBy ? (
                    <UserLink 
                      userId={rfi.createdBy.id}
                      userName={rfi.createdBy.name}
                      className="text-sm font-medium"
                    >
                      {rfi.createdBy.name}
                    </UserLink>
                  ) : (
                    <p className="text-sm text-steel-900">Unknown</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-steel-600 mb-1">Created</p>
                  <p className="text-sm text-steel-900">
                    {format(new Date(rfi.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {rfi.dueDate && (
                  <div>
                    <p className="text-sm font-medium text-steel-600 mb-1">Due Date</p>
                    <p className="text-sm text-steel-900">
                      {format(new Date(rfi.dueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                {rfi.client && (
                  <div>
                    <p className="text-sm font-medium text-steel-600 mb-1">Client</p>
                    <ClientLink 
                      clientId={rfi.client.id}
                      className="text-sm font-medium"
                    >
                      {rfi.client.name}
                    </ClientLink>
                  </div>
                )}
                {rfi.project && (
                  <div>
                    <p className="text-sm font-medium text-steel-600 mb-1">Project</p>
                    <ProjectLink 
                      projectId={rfi.project.id}
                      className="text-sm font-medium"
                    >
                      {rfi.project.projectNumber} - {rfi.project.name}
                    </ProjectLink>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Attachments</h3>
              </div>
              
              <div className="card-body">
                {attachmentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-12 bg-steel-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AttachmentList
                    attachments={attachments}
                    onDelete={handleDeleteAttachment}
                    canDelete={(attachment) => attachment.uploadedBy === user?.id || rfi?.createdById === user?.id}
                  />
                )}
                
                {/* File Upload Section */}
                <div className="mt-6 pt-6 border-t border-steel-200">
                  <h4 className="text-sm font-semibold text-steel-900 mb-3">Add New Attachment</h4>
                  <FileUpload
                    files={pendingFiles}
                    onFilesChange={setPendingFiles}
                    onUpload={handleFileUpload}
                    maxFiles={5}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {rfi && rfi.client && rfi.project && rfi.createdBy && (
          <EmailModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            rfi={rfi as RFI & { client: Client; project: Project; createdBy: User }}
            onSuccess={() => {
              // You could add a toast notification here
              alert('Email sent successfully!')
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}