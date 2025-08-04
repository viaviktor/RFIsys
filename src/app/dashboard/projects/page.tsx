'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProjects, useArchiveProject, useUnarchiveProject, useDeleteProject } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Tooltip, TimeAgoTooltip } from '@/components/ui/Tooltip'
import { Modal } from '@/components/ui/Modal'
import { ProjectActionMenu } from '@/components/ui/Dropdown'
import { CompactTable, Column, TableCell, TableSecondaryText } from '@/components/ui/CompactTable'
import { BulkActionsToolbar, commonBulkActions } from '@/components/ui/BulkActionsToolbar'
import { QuickFilterBadge, StatusBadge as ClickableStatusBadge } from '@/components/ui/ClickableBadge'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

export default function ProjectsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  
  // Modal states
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { projects, isLoading: projectsLoading, error } = useProjects({
    search: searchTerm,
    clientId: selectedClient,
    status: selectedStatus,
    active: showArchived ? false : undefined, // Show archived projects when showArchived is true, all projects when undefined
  })

  const { clients } = useClients({ active: true })
  
  // Archive/Delete functionality
  const { archiveProject, isArchiving } = useArchiveProject()
  const { unarchiveProject, isUnarchiving } = useUnarchiveProject()
  const { deleteProject, isDeleting } = useDeleteProject()
  
  // Loading states
  const [isBulkOperating, setIsBulkOperating] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Handler functions
  const handleArchive = async () => {
    if (!selectedProject) return
    try {
      await archiveProject(selectedProject.id)
      setShowArchiveModal(false)
      setSelectedProject(null)
    } catch (error) {
      console.error('Failed to archive project:', error)
    }
  }

  const handleUnarchive = async () => {
    if (!selectedProject) return
    try {
      await unarchiveProject(selectedProject.id)
      setShowUnarchiveModal(false)
      setSelectedProject(null)
    } catch (error) {
      console.error('Failed to unarchive project:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedProject) return
    try {
      await deleteProject(selectedProject.id)
      setShowDeleteModal(false)
      setSelectedProject(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedProjects(selectedIds)
  }

  const handleQuickFilter = (filterKey: string, filterValue?: string | number) => {
    switch (filterKey) {
      case 'status':
        setSelectedStatus(filterValue as string)
        break
      case 'active':
        setSelectedStatus('ACTIVE')
        setShowArchived(false)
        break
      case 'completed':
        setSelectedStatus('COMPLETED')
        setShowArchived(false)
        break
      default:
        break
    }
  }

  const handleBulkAction = async (actionId: string) => {
    setIsBulkOperating(true)
    try {
      switch (actionId) {
        case 'delete':
          await Promise.all(selectedProjects.map(id => deleteProject(id)))
          break
        case 'archive':
          await Promise.all(selectedProjects.map(id => archiveProject(id)))
          break
        default:
          break
      }
      setSelectedProjects([])
    } catch (error) {
      console.error('Bulk operation failed:', error)
    } finally {
      setIsBulkOperating(false)
    }
  }

  const canManageProject = (project: any) => user && (
    user.role === 'ADMIN' || 
    user.role === 'MANAGER' || 
    user.id === project.managerId
  )

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

  // Calculate stats
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    totalRFIs: projects.reduce((sum, project) => sum + (project._count?.rfis || 0), 0),
  }

  // Define table columns
  const projectColumns: Column[] = [
    {
      key: 'name',
      label: 'Project Name & Number',
      sortable: true,
      className: 'flex-1',
      render: (project) => (
        <div>
          <TableCell className="font-medium">{project.name}</TableCell>
          {project.projectNumber && (
            <TableSecondaryText>
              #{project.projectNumber}
            </TableSecondaryText>
          )}
        </div>
      )
    },
    {
      key: 'client',
      label: 'Client',
      width: '180px',
      render: (project) => (
        <div>
          <TableCell>{project.client?.name || 'No Client'}</TableCell>
          <TableSecondaryText>
            {project.client?.contactName || 'No Contact'}
          </TableSecondaryText>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      render: (project) => (
        <ClickableStatusBadge
          status={project.status}
          onFilter={(status) => setSelectedStatus(status)}
          active={selectedStatus === project.status}
        />
      )
    },
    {
      key: 'manager',
      label: 'Manager',
      width: '140px',
      render: (project) => (
        <TableCell>
          {project.manager?.name || 'Unassigned'}
        </TableCell>
      )
    },
    {
      key: 'rfis',
      label: 'RFIs',
      sortable: true,
      width: '80px',
      render: (project) => (
        <TableCell className="font-semibold text-orange-700">
          {project._count?.rfis || 0}
        </TableCell>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      width: '100px',
      render: (project) => (
        <TableSecondaryText>
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
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
                  Manage construction projects and track RFI progress
                </p>
              </div>
              <div className="flex gap-3">
                {(searchTerm || selectedClient || selectedStatus || showArchived) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedClient('')
                      setSelectedStatus('')
                      setShowArchived(false)
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Link href="/dashboard/projects/new">
                  <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                    New Project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards with Clickable Badges */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <BuildingOfficeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Projects</p>
                  <p className="text-2xl font-bold text-steel-900">{projectStats.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('active')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Active"
                    count={projectStats.active}
                    filterKey="status"
                    filterValue="ACTIVE"
                    onFilter={handleQuickFilter}
                    active={selectedStatus === 'ACTIVE'}
                    variant="success"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('completed')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-secondary">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Completed"
                    count={projectStats.completed}
                    filterKey="status"
                    filterValue="COMPLETED"
                    onFilter={handleQuickFilter}
                    active={selectedStatus === 'COMPLETED'}
                    variant="secondary"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total RFIs</p>
                  <p className="text-2xl font-bold text-steel-900">{projectStats.totalRFIs}</p>
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
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              />
            </div>

            <Select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ARCHIVED">Archived</option>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-archived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-steel-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="show-archived" className="text-sm font-medium text-steel-700">
                Show Archived Only
              </label>
            </div>
              </div>
            </div>

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedProjects.length}
              totalCount={projects.length}
              onClearSelection={() => setSelectedProjects([])}
              actions={[commonBulkActions.delete, commonBulkActions.archive]}
              onAction={handleBulkAction}
              isLoading={isBulkOperating || isDeleting || isArchiving}
              className="mb-6"
            />

            {/* Compact Projects Table */}
            <CompactTable
              data={projects}
              columns={projectColumns}
              selectedItems={selectedProjects}
              onSelectionChange={handleSelectionChange}
              getItemId={(project) => project.id}
              onItemClick={(project) => router.push(`/dashboard/projects/${project.id}`)}
              isLoading={projectsLoading}
              emptyMessage={searchTerm ? 'No projects match your search criteria' : 'No projects found. Create your first project to get started.'}
              showSelectAll={true}
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
                  <Link href="/dashboard/projects/new">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<PlusIcon className="w-4 h-4" />}>
                      New Project
                    </Button>
                  </Link>
                  <Link href="/dashboard/clients">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}>
                      Manage Clients
                    </Button>
                  </Link>
                  <Link href="/dashboard/rfis">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<DocumentTextIcon className="w-4 h-4" />}>
                      View All RFIs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Clients */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent Clients</h3>
                <div className="space-y-3">
                  {clients.slice(0, 3).map(client => (
                    <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <p className="font-medium text-steel-900">{client.name}</p>
                        <p className="text-sm text-steel-600">{client.contactName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Status Guide */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Status Guide</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Active - Currently in progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Completed - Project finished</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">On Hold - Temporarily paused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Archived - No longer active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Modal 
        isOpen={showArchiveModal} 
        onClose={() => setShowArchiveModal(false)}
        title="Archive Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-steel-700">
            Are you sure you want to archive this project? Archived projects will be hidden from the main list but can be restored later.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowArchiveModal(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving...' : 'Archive Project'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showUnarchiveModal} 
        onClose={() => setShowUnarchiveModal(false)}
        title="Unarchive Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-steel-700">
            Are you sure you want to unarchive this project? It will be restored to active status and appear in the main project list.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowUnarchiveModal(false)}
              disabled={isUnarchiving}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleUnarchive}
              disabled={isUnarchiving}
            >
              {isUnarchiving ? 'Unarchiving...' : 'Unarchive Project'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
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
                  Deleting this project will permanently remove all associated RFIs, attachments, responses, and files from the system.
                </p>
              </div>
            </div>
          </div>
          <p className="text-steel-700">
            Please type <strong>{selectedProject?.name}</strong> to confirm deletion:
          </p>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Project name"
            onChange={(e) => {
              const deleteButton = document.getElementById('delete-project-confirm-button') as HTMLButtonElement
              if (deleteButton) {
                deleteButton.disabled = e.target.value !== selectedProject?.name || isDeleting
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
              id="delete-project-confirm-button"
              variant="danger" 
              onClick={handleDelete}
              disabled={true}
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}