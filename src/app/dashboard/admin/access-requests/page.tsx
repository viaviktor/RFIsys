'use client'

import { useState } from 'react'
import { useAccessRequests } from '@/hooks/useAccessRequests'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ContactLink, ProjectLink, ClientLink } from '@/components/ui/EntityLinks'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function AccessRequestsPage() {
  const { accessRequests, isLoading, error, updateAccessRequest, refresh } = useAccessRequests()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await updateAccessRequest(id, 'APPROVED')
      toast.success('Access request approved')
      refresh()
    } catch (error) {
      console.error('Failed to approve request:', error)
      toast.error('Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      await updateAccessRequest(id, 'REJECTED')
      toast.success('Access request rejected')
      refresh()
    } catch (error) {
      console.error('Failed to reject request:', error)
      toast.error('Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load access requests</p>
        </div>
      </DashboardLayout>
    )
  }

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING')
  const processedRequests = accessRequests.filter(r => r.status !== 'PENDING')

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-steel-900">Access Requests</h1>
        <Badge variant={pendingRequests.length > 0 ? 'warning' : 'secondary'}>
          {pendingRequests.length} Pending
        </Badge>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-steel-800 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-orange-500" />
            Pending Requests
          </h2>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white border border-steel-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Contact Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-steel-900">
                        {request.contact ? (
                          <ContactLink contactId={request.contact.id}>
                            {request.contact.name}
                          </ContactLink>
                        ) : (
                          'Unknown Contact'
                        )}
                      </h3>
                      <p className="text-sm text-steel-600">{request.contact?.email}</p>
                      {request.contact?.title && (
                        <p className="text-sm text-steel-500">{request.contact.title}</p>
                      )}
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-steel-500">Requested Role:</span>
                        <Badge variant="secondary" className="ml-2">
                          {request.requestedRole === 'STAKEHOLDER_L1' ? 'Level 1 Stakeholder' : 'Level 2 Stakeholder'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-steel-500">Requested:</span>
                        <span className="ml-2 text-steel-700">{formatDateTime(new Date(request.createdAt))}</span>
                      </div>
                    </div>

                    {/* Project and Client Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-steel-500">Project:</span>
                        {request.project ? (
                          <ProjectLink projectId={request.project.id} className="ml-2">
                            {request.project.name}
                          </ProjectLink>
                        ) : (
                          <span className="ml-2 text-steel-400">N/A</span>
                        )}
                      </div>
                      <div>
                        <span className="text-steel-500">Client:</span>
                        {request.contact?.client ? (
                          <ClientLink clientId={request.contact.client.id} className="ml-2">
                            {request.contact.client.name}
                          </ClientLink>
                        ) : (
                          <span className="ml-2 text-steel-400">N/A</span>
                        )}
                      </div>
                    </div>

                    {/* Justification */}
                    {request.justification && (
                      <div>
                        <p className="text-sm text-steel-500">Justification:</p>
                        <p className="text-sm text-steel-700 mt-1 italic">"{request.justification}"</p>
                      </div>
                    )}

                    {/* Auto-approval info */}
                    {request.autoApprovalReason && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Auto-approval suggested:</span> {request.autoApprovalReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <XMarkIcon className="w-4 h-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-steel-800">Processed Requests</h2>
          <div className="grid gap-4">
            {processedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-steel-50 border border-steel-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-steel-900">
                        {request.contact ? (
                          <ContactLink contactId={request.contact.id}>
                            {request.contact.name}
                          </ContactLink>
                        ) : (
                          'Unknown Contact'
                        )}
                      </h3>
                      <Badge variant={request.status === 'APPROVED' ? 'success' : 'error'}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-steel-600">{request.contact?.email}</p>
                    <div className="flex items-center space-x-4 text-sm text-steel-500">
                      <span>Requested: {formatDateTime(new Date(request.createdAt))}</span>
                      {request.processedAt && (
                        <span>Processed: {formatDateTime(new Date(request.processedAt))}</span>
                      )}
                      {request.processedBy && (
                        <span>By: {request.processedBy.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {accessRequests.length === 0 && (
        <div className="text-center py-12 bg-steel-50 rounded-lg">
          <p className="text-steel-600">No access requests found</p>
        </div>
      )}
        </div>
      </div>
    </DashboardLayout>
  )
}