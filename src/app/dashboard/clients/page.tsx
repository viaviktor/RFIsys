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
import { CompactTable, Column, TableCell, TableSecondaryText } from '@/components/ui/CompactTable'
import { BulkActionsToolbar, commonBulkActions } from '@/components/ui/BulkActionsToolbar'
import { QuickFilterBadge } from '@/components/ui/ClickableBadge'
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
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { parseDeletionError } from '@/lib/utils'

export default function ClientsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const toast = useToast()
  
  // Modal states
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { clients, isLoading: clientsLoading, error, refetch } = useClients({
    search: searchTerm,
    active: true,
  })

  // Fetch ALL clients for stats calculation (unfiltered)
  const { clients: allClients } = useClients({}) // No filters for total counts
  
  // Delete functionality
  const { deleteClient, isDeleting } = useDeleteClient()
  
  // Loading states
  const [isBulkOperating, setIsBulkOperating] = useState(false)

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

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedClients(selectedIds)
  }

  const handleQuickFilter = (filterKey: string, filterValue?: string | number) => {
    // For clients, we can add filters like active status, etc. in the future
    console.log('Filter:', filterKey, filterValue)
  }

  const handleBulkAction = async (actionId: string) => {
    console.log('Bulk action triggered:', actionId, 'Selected clients:', selectedClients)
    setIsBulkOperating(true)
    
    try {
      switch (actionId) {
        case 'delete':
          if (canDeleteClient) {
            console.log('Deleting clients:', selectedClients)
            const results = await Promise.allSettled(
              selectedClients.map(id => deleteClient(id))
            )
            
            // Separate successful and failed deletions
            const successful = results.filter(r => r.status === 'fulfilled').length
            const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
            
            if (successful > 0) {
              toast.success(
                'Clients Deleted',
                `Successfully deleted ${successful} client${successful !== 1 ? 's' : ''}.`
              )
            }
            
            if (failures.length > 0) {
              // Group similar error messages
              const errorMessages = failures.map(f => parseDeletionError(f.reason))
              const uniqueErrors = [...new Set(errorMessages)]
              
              if (uniqueErrors.length === 1) {
                // All errors are the same
                toast.error(
                  `Failed to Delete ${failures.length} Client${failures.length !== 1 ? 's' : ''}`,
                  uniqueErrors[0],
                  8000 // Show longer for error messages
                )
              } else {
                // Multiple different errors
                toast.error(
                  `Failed to Delete ${failures.length} Client${failures.length !== 1 ? 's' : ''}`,
                  `${failures.length} client${failures.length !== 1 ? 's' : ''} could not be deleted due to various dependency conflicts. Check individual clients for details.`,
                  8000
                )
              }
              
              console.error('Deletion failures:', failures.map(f => ({
                error: f.reason,
                parsed: parseDeletionError(f.reason)
              })))
            }
            
            setSelectedClients([])
            refetch() // Refresh the list to show updated state
          } else {
            toast.error('Permission Denied', 'You do not have permission to delete clients. Admin access required.')
          }
          break
        default:
          console.log('Unknown action:', actionId)
          break
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      toast.error('Operation Failed', parseDeletionError(error))
    } finally {
      setIsBulkOperating(false)
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

  // Calculate stats from ALL clients (unfiltered) for consistent badge counts
  const clientStats = {
    total: allClients.length,
    active: allClients.filter(c => c.active).length,
    totalProjects: allClients.reduce((sum, client) => sum + (client._count?.projects || 0), 0),
    totalRFIs: allClients.reduce((sum, client) => sum + (client._count?.rfis || 0), 0),
  }

  // Define table columns
  const clientColumns: Column[] = [
    {
      key: 'name',
      label: 'Client Name',
      sortable: true,
      className: 'flex-1',
      render: (client) => (
        <div>
          <TableCell className="font-medium">{client.name}</TableCell>
          <TableSecondaryText>
            {client.city && client.state ? `${client.city}, ${client.state}` : 'Location not set'}
          </TableSecondaryText>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Primary Contact',
      width: '180px',
      render: (client) => (
        <div>
          <TableCell>{client.contactName || 'No Contact'}</TableCell>
          {client.email && (
            <TableSecondaryText className="truncate">
              {client.email}
            </TableSecondaryText>
          )}
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '140px',
      render: (client) => (
        <TableCell>
          {client.phone || 'Not provided'}
        </TableCell>
      )
    },
    {
      key: 'projects',
      label: 'Projects',
      sortable: true,
      width: '100px',
      render: (client) => (
        <TableCell className="font-semibold text-orange-700">
          {client._count?.projects || 0}
        </TableCell>
      )
    },
    {
      key: 'rfis',
      label: 'RFIs',
      sortable: true,
      width: '80px',
      render: (client) => (
        <TableCell className="font-semibold text-blue-600">
          {client._count?.rfis || 0}
        </TableCell>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (client) => (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          client.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {client.active ? 'Active' : 'Inactive'}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Added',
      sortable: true,
      width: '100px',
      render: (client) => (
        <TableSecondaryText>
          {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
        </TableSecondaryText>
      )
    }
  ]

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
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Filters
                  </Button>
                )}
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

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedClients.length}
              totalCount={clients.length}
              onClearSelection={() => setSelectedClients([])}
              actions={canDeleteClient ? [commonBulkActions.delete] : []}
              onAction={handleBulkAction}
              isLoading={isBulkOperating || isDeleting}
              className="mb-6"
            />

            {/* Compact Clients Table */}
            <CompactTable
              data={clients}
              columns={clientColumns}
              selectedItems={selectedClients}
              onSelectionChange={handleSelectionChange}
              getItemId={(client) => client.id}
              onItemClick={(client) => router.push(`/dashboard/clients/${client.id}`)}
              isLoading={clientsLoading}
              emptyMessage={searchTerm ? 'No clients match your search criteria' : 'No clients found. Create your first client to get started.'}
              showSelectAll={canDeleteClient}
              enableHover={true}
            />
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </DashboardLayout>
  )
}