'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useClient } from '@/hooks/useClients'
import { useClientContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/Button'
import { ContactList } from '@/components/contacts/ContactList'
import { ContactModal } from '@/components/contacts/ContactModal'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon
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

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/dashboard/clients">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  Back to Clients
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">{client.name}</h1>
            <p className="text-steel-600 font-medium">Client Information & Contacts</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/rfis/new?clientId=${clientId}`}>
              <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                New RFI
              </Button>
            </Link>
            <Link href={`/dashboard/clients/${clientId}/edit`}>
              <Button variant="outline" leftIcon={<PencilIcon className="w-5 h-5" />}>
                Edit Client
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Client Information */}
          <div className="xl:col-span-2 space-y-6">
            {/* Client Details Card */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-steel-900">{client.name}</h2>
                    <p className="text-steel-600">Client Details</p>
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
          </div>

          {/* Right Column - Contacts */}
          <div>
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