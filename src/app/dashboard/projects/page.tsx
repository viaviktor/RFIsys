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
import { EntityGrid, ProjectCard } from '@/components/ui/EntityCards'
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
  
  // Modal states
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { projects, isLoading: projectsLoading, error } = useProjects({
    search: searchTerm,
    clientId: selectedClient,
    status: selectedStatus,
    active: !showArchived,
  })

  const { clients } = useClients({ active: true })
  
  // Archive/Delete functionality
  const { archiveProject, isArchiving } = useArchiveProject()
  const { unarchiveProject, isUnarchiving } = useUnarchiveProject()
  const { deleteProject, isDeleting } = useDeleteProject()

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
                <Link href="/dashboard/projects/new">
                  <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                    New Project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Projects</p>
                  <p className="text-2xl font-bold text-steel-900">{projectStats.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Active</p>
                  <p className="text-2xl font-bold text-steel-900">{projectStats.active}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon-secondary">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Completed</p>
                  <p className="text-2xl font-bold text-steel-900">{projectStats.completed}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <DocumentTextIcon className="w-5 h-5" />
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

            {/* Projects List */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-steel-900">
                  {showArchived ? 'Archived Projects' : 'Active Projects'}
                </h2>
              </div>
              <div className="card-body">
                {projectsLoading ? (
                  <EntityGrid columns={2}>
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
                    <p className="text-steel-500 mb-4">Error loading projects: {error.message}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <BuildingOfficeIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">
                      {searchTerm ? 'No projects match your search criteria' : 'No projects found'}
                    </p>
                    <Link href="/dashboard/projects/new">
                      <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                        Create your first project
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <EntityGrid columns={2}>
                    {projects.map((project) => (
                      <ProjectCard 
                        key={project.id}
                        project={project}
                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        className="card-interactive"
                      />
                    ))}
                  </EntityGrid>
                )}
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