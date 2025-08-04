'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFI, useDeleteRFI } from '@/hooks/useRFIs'
import { useResponses, useCreateResponse } from '@/hooks/useResponses'
import { useAttachments } from '@/hooks/useAttachments'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PriorityBadge } from '@/components/ui/Badge'
import { AttachmentList } from '@/components/ui/AttachmentList'
import { FileUpload, type FileUploadFile } from '@/components/ui/FileUpload'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ArrowLeftIcon, PaperAirplaneIcon, DocumentArrowDownIcon, EnvelopeIcon, TrashIcon } from '@heroicons/react/24/outline'
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
  const { deleteRFI } = useDeleteRFI()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<FileUploadFile[]>([])
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteRFI = async () => {
    if (!rfi) return
    
    setIsDeleting(true)
    try {
      await deleteRFI(rfi.id)
      router.push('/dashboard/rfis')
    } catch (error) {
      console.error('Failed to delete RFI:', error)
      alert('Failed to delete RFI. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
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
                    {responses.map((response) => {
                      const author = response.author || response.authorContact
                      const authorName = author?.name || 'Unknown User'
                      const authorInitial = authorName.charAt(0).toUpperCase()
                      
                      return (
                        <div key={response.id} className="border-b border-steel-100 last:border-b-0 pb-6 last:pb-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-orange-600">
                                {authorInitial}
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
                                ) : response.authorContact ? (
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-steel-900">
                                      {response.authorContact.name}
                                    </p>
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                      {response.authorContact.role === 'STAKEHOLDER_L1' ? 'Stakeholder L1' : 'Stakeholder L2'}
                                    </span>
                                  </div>
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
                      )
                    })}
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
                  <p className="text-sm font-medium text-steel-600 mb-2">Status</p>
                  <div className="relative">
                    <div className="relative">
                      <select
                        value={rfi.status}
                        onChange={(e) => handleStatusChange(e.target.value as RFIStatus)}
                        disabled={isUpdatingStatus}
                        className="w-full px-4 py-3 pr-12 rounded-lg border border-steel-300 bg-white text-steel-900 font-medium text-sm appearance-none cursor-pointer transition-all hover:border-steel-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-steel-50"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      
                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-steel-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      {/* Loading spinner */}
                      {isUpdatingStatus && (
                        <div className="absolute inset-y-0 right-10 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Status indicator and description */}
                    <div className={`mt-2 px-3 py-2 rounded-md text-xs font-medium ${
                      rfi.status === 'DRAFT' 
                        ? 'bg-steel-50 text-steel-700 border border-steel-200' 
                        : rfi.status === 'OPEN' 
                        ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        : 'bg-green-50 text-green-800 border border-green-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          rfi.status === 'DRAFT' 
                            ? 'bg-steel-400' 
                            : rfi.status === 'OPEN' 
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}></span>
                        <span>
                          {rfi.status === 'DRAFT' && 'This RFI is in draft mode and not yet sent'}
                          {rfi.status === 'OPEN' && 'This RFI is open and awaiting response'}
                          {rfi.status === 'CLOSED' && 'This RFI has been resolved and closed'}
                        </span>
                      </div>
                    </div>
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
                  <p className="text-sm font-medium text-steel-600 mb-1">Due Date</p>
                  {rfi.dueDate ? (
                    <p className={`text-sm font-medium ${
                      new Date(rfi.dueDate) < new Date() && rfi.status !== 'CLOSED' 
                        ? 'text-red-600' 
                        : 'text-steel-900'
                    }`}>
                      {format(new Date(rfi.dueDate), 'MMM d, yyyy')}
                      {new Date(rfi.dueDate) < new Date() && rfi.status !== 'CLOSED' && (
                        <span className="ml-2 text-xs font-normal">(Overdue)</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-steel-500 italic">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-steel-600 mb-1">Date Needed By</p>
                  {rfi.dateNeededBy ? (
                    <p className="text-sm text-steel-900">
                      {format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-steel-500 italic">Not specified</p>
                  )}
                </div>
                {rfi.dateSent && (
                  <div>
                    <p className="text-sm font-medium text-steel-600 mb-1">Date Sent</p>
                    <p className="text-sm text-steel-900">
                      {format(new Date(rfi.dateSent), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-steel-600 mb-1">Created</p>
                  <p className="text-sm text-steel-900">
                    {format(new Date(rfi.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
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

            {/* Admin Actions Card */}
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || rfi?.createdById === user?.id) && (
              <div className="bg-white rounded-lg shadow-steel border border-steel-200">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-steel-900">Actions</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      leftIcon={<TrashIcon className="w-4 h-4" />}
                      className="w-full justify-center"
                    >
                      Delete RFI
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-steel-500 bg-opacity-75" onClick={() => setShowDeleteConfirm(false)}></div>
              <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-steel-900">
                      Delete RFI
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-steel-500">
                        Are you sure you want to delete this RFI? This action cannot be undone and will permanently remove the RFI, all responses, and attachments.
                      </p>
                      <p className="mt-2 text-sm font-medium text-steel-900">
                        RFI: {rfi?.rfiNumber} - {rfi?.title}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    variant="danger"
                    onClick={handleDeleteRFI}
                    isLoading={isDeleting}
                    disabled={isDeleting}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete RFI'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="w-full mt-3 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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