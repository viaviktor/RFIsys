'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useClient } from '@/hooks/useClients'
import { useClientContacts } from '@/hooks/useContacts'
import { useProjects } from '@/hooks/useProjects'
import { useRFIs } from '@/hooks/useRFIs'
import { Button } from '@/components/ui/Button'
import { ContactList } from '@/components/contacts/ContactList'
import { ContactModal } from '@/components/contacts/ContactModal'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SmartNav } from '@/components/ui/ContextualNav'
import { QuickNav, ProjectLink, RFILink } from '@/components/ui/EntityLinks'
import { EntityGrid, ProjectCard, RFICard } from '@/components/ui/EntityCards'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Contact } from '@/types'
import Link from 'next/link'

export default function ClientDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const { client, isLoading: clientLoading, error: clientError } = useClient(clientId)
  const { 
    contacts, 
    isLoading: contactsLoading, 
    createContact, 
    updateContact, 
    deleteContact 
  } = useClientContacts(clientId)

  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const handleAddContact = () => {
    setEditingContact(null)
    setIsContactModalOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setIsContactModalOpen(true)
  }

  const handleContactSubmit = async (data: any) => {
    if (editingContact) {
      await updateContact(editingContact.id, data)
    } else {
      await createContact(data)
    }
    setIsContactModalOpen(false)
    setEditingContact(null)
  }


  if (authLoading || clientLoading) {
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

  if (clientError) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Error</h2>
              <p className="text-steel-600 mb-6">Failed to load client: {clientError.message}</p>
              <Link href="/dashboard/clients">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to Clients
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Client Not Found</h2>
              <p className="text-steel-600 mb-6">The requested client could not be found.</p>
              <Link href="/dashboard/clients">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to Clients
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Get client projects and RFIs for QuickNav
  const { projects, isLoading: projectsLoading } = useProjects({ clientId })
  const { rfis, isLoading: rfisLoading } = useRFIs({ 
    filters: { clientId }, 
    limit: 10 
  })

  // Prepare quick nav items
  const quickNavItems: Array<{
    type: 'client' | 'project' | 'rfi' | 'user' | 'contact'
    id: string
    label: string
  }> = []
  
  // Add recent projects to quick nav (only if loaded)
  if (projects && !projectsLoading) {
    projects.slice(0, 5).forEach(project => {
      quickNavItems.push({
        type: 'project' as const,
        id: project.id,
        label: project.name,
      })
    })
  }
  
  // Add recent RFIs to quick nav (only if loaded)
  if (rfis && !rfisLoading) {
    rfis.slice(0, 5).forEach(rfi => {
      quickNavItems.push({
        type: 'rfi' as const,
        id: rfi.id,
        label: rfi.rfiNumber || `RFI ${rfi.id.slice(0, 8)}`,
      })
    })
  }

  return (
    <DashboardLayout>
      {/* Smart Navigation */}
      <SmartNav 
        entityType="client"
        entityId={client.id}
        entityData={client}
      />
      
      <div className="page-container">
        {/* Client Overview Card */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-steel-900">{client.name}</h2>
                  <p className="text-steel-600 mt-1">Client Information & Contacts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Client Details Card */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-steel-900">Client Details</h3>
                    <p className="text-steel-600 text-sm">Contact information and address</p>
                  </div>
                </div>
              </div>

              <div className="card-body space-y-6">
                {/* Primary Contact */}
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Primary Contact</p>
                    <p className="text-steel-900 font-medium">{client.contactName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="w-5 h-5 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Email</p>
                    <a 
                      href={`mailto:${client.email}`}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                {client.phone && (
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="w-5 h-5 text-steel-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-steel-600">Phone</p>
                      <a 
                        href={`tel:${client.phone}`}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {client.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Address */}
                {(client.address || client.city || client.state) && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 text-steel-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-steel-600">Address</p>
                      <div className="text-steel-900">
                        {client.address && <p>{client.address}</p>}
                        {(client.city || client.state || client.zipCode) && (
                          <p>
                            {client.city}
                            {client.city && client.state && ', '}
                            {client.state} {client.zipCode}
                          </p>
                        )}
                        {client.country && client.country !== 'USA' && (
                          <p>{client.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {client.notes && (
                  <div className="pt-4 border-t border-steel-200">
                    <p className="text-sm font-medium text-steel-600 mb-2">Notes</p>
                    <p className="text-steel-700 leading-relaxed">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Projects Section */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Projects</h3>
              </div>
              <div className="card-body">
                {!projects || projects.length === 0 ? (
                  <div className="text-center py-8">
                    <BuildingOfficeIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">No projects found for this client</p>
                    <Link href={`/dashboard/projects/new?clientId=${clientId}`}>
                      <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                        Create First Project
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <EntityGrid columns={2}>
                    {projects.slice(0, 6).map((project) => (
                      <ProjectCard 
                        key={project.id}
                        project={project}
                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        className="card-interactive"
                      />
                    ))}
                  </EntityGrid>
                )}
                {projects && projects.length > 6 && (
                  <div className="mt-4 text-center">
                    <Link href={`/dashboard/projects?clientId=${clientId}`}>
                      <Button variant="outline">View All Projects ({projects.length})</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Client RFIs Section */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Recent RFIs</h3>
              </div>
              <div className="card-body">
                {!rfis || rfis.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">No RFIs found for this client</p>
                    <Link href={`/dashboard/rfis/new?clientId=${clientId}`}>
                      <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                        Create First RFI
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <EntityGrid columns={2}>
                    {rfis.slice(0, 6).map((rfi) => (
                      <RFICard 
                        key={rfi.id}
                        rfi={rfi}
                        onClick={() => router.push(`/dashboard/rfis/${rfi.id}`)}
                        className="card-interactive"
                      />
                    ))}
                  </EntityGrid>
                )}
                {rfis && rfis.length > 6 && (
                  <div className="mt-4 text-center">
                    <Link href={`/dashboard/rfis?clientId=${clientId}`}>
                      <Button variant="outline">View All RFIs ({rfis.length})</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Navigation */}
            {quickNavItems.length > 0 && (
              <QuickNav 
                items={quickNavItems}
                title="Quick Navigation"
              />
            )}

            {/* Client Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Client Actions</h3>
                <div className="space-y-3">
                  <Link href={`/dashboard/projects/new?clientId=${clientId}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                      New Project
                    </Button>
                  </Link>
                  <Link href={`/dashboard/rfis/new?clientId=${clientId}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                      New RFI
                    </Button>
                  </Link>
                  <Link href={`/dashboard/clients/${clientId}/edit`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PencilIcon className="w-4 h-4" />}
                    >
                      Edit Client
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Contacts Section */}
            <ContactList
              contacts={contacts}
              isLoading={contactsLoading}
              onAdd={handleAddContact}
              onEdit={handleEditContact}
              onDelete={deleteContact}
            />
          </div>
        </div>

        {/* Contact Modal */}
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false)
            setEditingContact(null)
          }}
          onSubmit={handleContactSubmit}
          contact={editingContact}
          clientName={client.name}
        />
      </div>
    </DashboardLayout>
  )
}