'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Modal } from '@/components/ui/Modal'
import { ClientActionMenu } from '@/components/ui/Dropdown'
import { EntityGrid, ClientCard } from '@/components/ui/EntityCards'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  TrashIcon,
  FolderIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default function ClientsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { clients, isLoading: clientsLoading, error, refetch } = useClients({
    search: searchTerm,
    active: true,
  })
  
  // Delete functionality
  const { deleteClient, isDeleting } = useDeleteClient()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const handleDeleteClient = async () => {
    if (!selectedClient) return
    try {
      await deleteClient(selectedClient.id)
      setShowDeleteModal(false)
      setSelectedClient(null)
    } catch (error) {
      console.error('Failed to delete client:', error)
    }
  }

  const canDeleteClient = user?.role === 'ADMIN'

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

  const clientStats = {
    total: clients.length,
    active: clients.filter(c => c.active).length,
    totalProjects: clients.reduce((sum, client) => sum + (client._count?.projects || 0), 0),
    totalRFIs: clients.reduce((sum, client) => sum + (client._count?.rfis || 0), 0),
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Welcome back, {user?.name}
                </h1>
                <p className="text-steel-600">
                  Manage industrial clients and track project relationships
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/clients/new">
                  <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                    New Client
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <BuildingOfficeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Clients</p>
                  <p className="text-2xl font-bold text-steel-900">{clientStats.total}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <span className="text-lg font-bold">✓</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Active</p>
                  <p className="text-2xl font-bold text-steel-900">{clientStats.active}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Projects</p>
                  <p className="text-2xl font-bold text-steel-900">{clientStats.totalProjects}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-orange-500 text-white">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total RFIs</p>
                  <p className="text-2xl font-bold text-steel-900">{clientStats.totalRFIs}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Filters */}
            <div className="filter-bar">
              <div className="filter-grid">
                <div className="relative">
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
                  />
                </div>
              </div>
            </div>

            {/* Clients List */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-steel-900">
                  Clients {searchTerm && `matching "${searchTerm}"`}
                </h2>
              </div>
              <div className="card-body">
                {clientsLoading ? (
                  <EntityGrid columns={3}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="card p-4">
                          <div className="h-4 bg-steel-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-steel-200 rounded w-1/2 mb-3"></div>
                          <div className="space-y-1">
                            <div className="h-3 bg-steel-200 rounded"></div>
                            <div className="h-3 bg-steel-200 rounded w-5/6"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </EntityGrid>
                ) : error ? (
                  <div className="text-center py-12">
                    <XCircleIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">Error loading clients: {error.message}</p>
                    <Button variant="outline" onClick={refetch}>
                      Try Again
                    </Button>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-12">
                    <BuildingOfficeIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">
                      {searchTerm ? 'No clients match your search criteria' : 'No clients found'}
                    </p>
                    <Link href="/dashboard/clients/new">
                      <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                        Create your first client
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <EntityGrid columns={3}>
                    {clients.map((client) => (
                      <ClientCard 
                        key={client.id}
                        client={client}
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                        className="card-interactive"
                      />
                    ))}
                  </EntityGrid>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/clients/new">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<PlusIcon className="w-4 h-4" />}>
                      New Client
                    </Button>
                  </Link>
                  <Link href="/dashboard/projects">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<FolderIcon className="w-4 h-4" />}>
                      View Projects
                    </Button>
                  </Link>
                  <Link href="/dashboard/rfis">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<DocumentTextIcon className="w-4 h-4" />}>
                      View RFIs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Top Clients</h3>
                <div className="space-y-3">
                  {clients
                    .sort((a, b) => (b._count?.projects || 0) - (a._count?.projects || 0))
                    .slice(0, 5)
                    .map(client => (
                    <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <p className="font-medium text-steel-900">{client.name}</p>
                        <div className="flex items-center gap-4 text-xs text-steel-500 mt-1">
                          <span>{client._count?.projects || 0} projects</span>
                          <span>{client._count?.rfis || 0} RFIs</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent Clients</h3>
                <div className="space-y-3">
                  {clients
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 3)
                    .map(client => (
                    <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <p className="font-medium text-steel-900">{client.name}</p>
                        <p className="text-sm text-steel-600">{client.contactName}</p>
                        <p className="text-xs text-steel-500 mt-1">
                          Added {formatDistanceToNow(new Date(client.createdAt))} ago
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Client"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">
                  This action cannot be undone
                </h4>
                <p className="text-sm text-red-700">
                  Deleting this client will permanently remove all associated projects, RFIs, contacts and files from the system.
                </p>
              </div>
            </div>
          </div>
          <p className="text-steel-700">
            Please type <strong>{selectedClient?.name}</strong> to confirm deletion:
          </p>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Client name"
            onChange={(e) => {
              const deleteButton = document.getElementById('delete-client-confirm-button') as HTMLButtonElement
              if (deleteButton) {
                deleteButton.disabled = e.target.value !== selectedClient?.name || isDeleting
              }
            }}
          />
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              id="delete-client-confirm-button"
              variant="danger" 
              onClick={handleDeleteClient}
              disabled={true}
            >
              {isDeleting ? 'Deleting...' : 'Delete Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}