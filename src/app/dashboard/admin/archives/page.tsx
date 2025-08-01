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
import { Modal } from '@/components/ui/Modal'
import { EntityGrid, ProjectCard } from '@/components/ui/EntityCards'
import { 
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default function ProjectArchivesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('archived')
  
  // Modal states
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Get archived and active projects
  const { projects: archivedProjects, isLoading: archivedLoading } = useProjects({
    search: searchTerm,
    clientId: selectedClient,
    status: selectedStatus === 'archived' ? 'ARCHIVED' : undefined,
    active: selectedStatus === 'active',
  })

  const { projects: allProjects } = useProjects({ active: false }) // Get all projects for stats
  const { clients } = useClients({ active: true })
  
  // Archive/Delete functionality
  const { unarchiveProject, isUnarchiving } = useUnarchiveProject()
  const { deleteProject, isDeleting } = useDeleteProject()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!authLoading && isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, authLoading, user, router])

  // Handler functions
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

  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-xl font-bold text-steel-900 mb-2">Access Denied</h2>
              <p className="text-steel-600 mb-4">You don't have permission to access this page.</p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate stats
  const archiveStats = {
    total: allProjects.length,
    archived: allProjects.filter(p => p.status === 'ARCHIVED').length,
    active: allProjects.filter(p => p.status !== 'ARCHIVED').length,
    archivedThisMonth: allProjects.filter(p => 
      p.status === 'ARCHIVED' && 
      p.updatedAt && 
      new Date(p.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length,
  }

  const displayProjects = selectedStatus === 'archived' 
    ? archivedProjects.filter(p => p.status === 'ARCHIVED')
    : archivedProjects.filter(p => p.status !== 'ARCHIVED')

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Project Archive Management
                </h1>
                <p className="text-steel-600">
                  Manage archived projects, restore active projects, and maintain project lifecycle
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/projects">
                  <Button variant="outline" leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}>
                    All Projects
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <BuildingOfficeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Projects</p>
                  <p className="text-2xl font-bold text-steel-900">{archiveStats.total}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-blue text-white">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Active</p>
                  <p className="text-2xl font-bold text-steel-900">{archiveStats.active}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-steel-500 text-white">
                  <ArchiveBoxIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Archived</p>
                  <p className="text-2xl font-bold text-steel-900">{archiveStats.archived}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-yellow text-steel-900">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">This Month</p>
                  <p className="text-2xl font-bold text-steel-900">{archiveStats.archivedThisMonth}</p>
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
                  <option value="archived">Archived Projects</option>
                  <option value="active">Active Projects</option>
                </Select>
              </div>
            </div>

            {/* Projects List */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-steel-900">
                  {selectedStatus === 'archived' ? 'Archived Projects' : 'Active Projects'}
                  <span className="ml-2 text-sm font-normal text-steel-600">
                    ({displayProjects.length} found)
                  </span>
                </h2>
              </div>
              <div className="card-body">
                {archivedLoading ? (
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
                ) : displayProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <ArchiveBoxIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">
                      {searchTerm 
                        ? `No ${selectedStatus} projects match your search criteria` 
                        : `No ${selectedStatus} projects found`
                      }
                    </p>
                    {selectedStatus === 'archived' && (
                      <p className="text-steel-400 text-sm">
                        Projects will appear here when they are archived
                      </p>
                    )}
                  </div>
                ) : (
                  <EntityGrid columns={2}>
                    {displayProjects.map((project) => (
                      <div key={project.id} className="relative">
                        <ProjectCard 
                          project={project}
                          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                          className="card-interactive"
                        />
                        
                        {/* Archive Actions Overlay */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {project.status === 'ARCHIVED' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProject(project)
                                setShowUnarchiveModal(true)
                              }}
                              className="bg-white/90 hover:bg-white text-steel-600 hover:text-green-600 shadow-sm"
                              title="Unarchive project"
                            >
                              <ArchiveBoxXMarkIcon className="w-4 h-4" />
                            </Button>
                          ) : null}
                          
                          {user?.role === 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProject(project)
                                setShowDeleteModal(true)
                              }}
                              className="bg-white/90 hover:bg-white text-steel-600 hover:text-red-600 shadow-sm"
                              title="Delete project permanently"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
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
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<ArchiveBoxIcon className="w-4 h-4" />}
                    onClick={() => setSelectedStatus('archived')}
                  >
                    View Archived Projects
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    onClick={() => setSelectedStatus('active')}
                  >
                    View Active Projects
                  </Button>
                  <Link href="/dashboard/projects/new">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}
                    >
                      Create New Project
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Archive Information */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Archive Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Archive Policy:</span>
                    <span className="font-medium">Manual only</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Data Retention:</span>
                    <span className="font-medium">Indefinite</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Restoration:</span>
                    <span className="font-medium">Admin only</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Deletion:</span>
                    <span className="font-medium">Permanent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent Archive Activity</h3>
                <div className="space-y-3">
                  {allProjects
                    .filter(p => p.status === 'ARCHIVED')
                    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
                    .slice(0, 5)
                    .map(project => (
                      <div key={project.id} className="flex items-start gap-2 p-2 border border-steel-200 rounded">
                        <ArchiveBoxIcon className="w-4 h-4 text-steel-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-steel-900 text-sm truncate">{project.name}</p>
                          <p className="text-xs text-steel-500">
                            Archived {project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt)) : 'recently'} ago
                          </p>
                        </div>
                      </div>
                    ))}
                  {allProjects.filter(p => p.status === 'ARCHIVED').length === 0 && (
                    <p className="text-sm text-steel-500 text-center py-4">No recent archive activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unarchive Modal */}
      <Modal 
        isOpen={showUnarchiveModal} 
        onClose={() => setShowUnarchiveModal(false)}
        title="Unarchive Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-steel-700">
            Are you sure you want to unarchive <strong>{selectedProject?.name}</strong>? 
            It will be restored to active status and appear in the main project list.
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

      {/* Delete Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project Permanently"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
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
              const deleteButton = document.getElementById('delete-archive-confirm-button') as HTMLButtonElement
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
              id="delete-archive-confirm-button"
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