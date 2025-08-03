'use client'

import { notFound } from 'next/navigation'
import { useContact } from '@/hooks/useContacts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SmartNav } from '@/components/ui/ContextualNav'
import { Badge } from '@/components/ui/Badge'
import { ClientLink } from '@/components/ui/EntityLinks'
import { formatDateTime } from '@/lib/utils'
import { EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, UserGroupIcon } from '@heroicons/react/24/outline'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params
  
  return <ContactDetailContent id={id} />
}

function ContactDetailContent({ id }: { id: string }) {
  const { contact, isLoading, error } = useContact(id)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !contact) {
    notFound()
  }

  return (
    <DashboardLayout>
      <SmartNav 
        entityType="contact" 
        entityId={contact.id} 
        entityData={contact}
      />

      <div className="page-container">
        <div className="content-grid">
          <div className="main-content space-y-6">
            {/* Contact Info Card */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-steel-900">Contact Information</h2>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-steel-600">Name</p>
                    <p className="font-medium text-steel-900">{contact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-steel-600">Title</p>
                    <p className="font-medium text-steel-900">{contact.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-steel-600">Email</p>
                    <p className="font-medium text-steel-900 flex items-center">
                      <EnvelopeIcon className="w-4 h-4 mr-2 text-steel-400" />
                      {contact.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-steel-600">Phone</p>
                    <p className="font-medium text-steel-900 flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-2 text-steel-400" />
                      {contact.phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Card */}
            {contact.projectStakeholders && contact.projectStakeholders.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2 className="text-xl font-semibold text-steel-900">Project Access</h2>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {contact.projectStakeholders.map((ps: any) => (
                      <div key={ps.id} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                        <div>
                          <p className="font-medium text-steel-900">{ps.project?.name || 'Unknown Project'}</p>
                          <p className="text-sm text-steel-600">
                            Level {ps.stakeholderLevel} Stakeholder
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {ps.stakeholderLevel === 1 ? 'L1' : 'L2'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-content space-y-6">
            {/* Status Card */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-steel-600">Registration Status</p>
                    <Badge variant={contact.password ? 'success' : 'secondary'}>
                      {contact.password ? 'Registered' : 'Not Registered'}
                    </Badge>
                  </div>
                  {contact.role && (
                    <div>
                      <p className="text-sm text-steel-600">Role</p>
                      <Badge variant="primary">{contact.role}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client Card */}
            {contact.client && (
              <div className="card">
                <div className="card-body">
                  <h3 className="text-lg font-semibold text-steel-900 mb-4">Client</h3>
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-steel-400" />
                    <ClientLink clientId={contact.client.id} clientName={contact.client.name}>
                      {contact.client.name}
                    </ClientLink>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-steel-600">Created</p>
                    <p className="text-steel-900">{formatDateTime(new Date(contact.createdAt))}</p>
                  </div>
                  <div>
                    <p className="text-steel-600">Last Updated</p>
                    <p className="text-steel-900">{formatDateTime(new Date(contact.updatedAt))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}