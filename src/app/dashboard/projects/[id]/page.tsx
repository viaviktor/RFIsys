'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProject, useArchiveProject, useUnarchiveProject, useDeleteProject } from '@/hooks/useProjects'
import { useRFIs } from '@/hooks/useRFIs'
import { useStakeholders } from '@/hooks/useStakeholders'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StakeholderList } from '@/components/stakeholders/StakeholderList'
import { Modal } from '@/components/ui/Modal'
import { 
  ArrowLeftIcon, 
  PlusIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const { project, isLoading: projectLoading, error: projectError, refetch } = useProject(projectId)
  const { rfis, isLoading: rfisLoading } = useRFIs({
    filters: { projectId },
    limit: 50,
  })
  const { stakeholders, isLoading: stakeholdersLoading, addStakeholder, removeStakeholder } = useStakeholders(projectId)
  const { contacts, isLoading: contactsLoading } = useContacts(project?.clientId || '')
  
  // Archive/Delete functionality
  const { archiveProject, isArchiving } = useArchiveProject()
  const { unarchiveProject, isUnarchiving } = useUnarchiveProject()
  const { deleteProject, isDeleting } = useDeleteProject()
  
  // Modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Handler functions
  const handleArchive = async () => {
    try {
      await archiveProject(projectId)
      await refetch()
      setShowArchiveModal(false)
    } catch (error) {
      console.error('Failed to archive project:', error)
    }
  }

  const handleUnarchive = async () => {
    try {
      await unarchiveProject(projectId)
      await refetch()
      setShowUnarchiveModal(false)
    } catch (error) {
      console.error('Failed to unarchive project:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(projectId)
      setShowDeleteModal(false)
      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const canManageProject = user && (
    user.role === 'ADMIN' || 
    user.role === 'MANAGER' || 
    user.id === project?.managerId
  )

  if (authLoading || projectLoading) {
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

  if (projectError) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Error</h2>
              <p className="text-steel-600 mb-6">Failed to load project: {projectError.message}</p>
              <Link href="/dashboard/projects">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Project Not Found</h2>
              <p className="text-steel-600 mb-6">The requested project could not be found.</p>
              <Link href="/dashboard/projects">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const rfiStats = {
    total: rfis.length,
    draft: rfis.filter(rfi => rfi.status === 'DRAFT').length,
    open: rfis.filter(rfi => rfi.status === 'OPEN').length,
    closed: rfis.filter(rfi => rfi.status === 'CLOSED').length,
    overdue: rfis.filter(rfi => 
      rfi.dateNeededBy && 
      new Date(rfi.dateNeededBy) < new Date() && 
      rfi.status !== 'CLOSED'
    ).length,
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/dashboard/projects">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  Back to Projects
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">
              {project.projectNumber || project.name}
            </h1>
            <p className="text-steel-600 font-medium">Project Details & RFI Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/projects/${project.id}/edit`}>
              <Button variant="outline" leftIcon={<PencilIcon className="w-5 h-5" />}>
                Edit Project
              </Button>
            </Link>
            
            {canManageProject && (
              <>
                {project.status === 'ARCHIVED' ? (
                  <Button 
                    variant="outline" 
                    leftIcon={<ArchiveBoxXMarkIcon className="w-5 h-5" />}
                    onClick={() => setShowUnarchiveModal(true)}
                    disabled={isUnarchiving}
                  >
                    {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    leftIcon={<ArchiveBoxIcon className="w-5 h-5" />}
                    onClick={() => setShowArchiveModal(true)}
                    disabled={isArchiving}
                  >
                    {isArchiving ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
                
                {user?.role === 'ADMIN' && (
                  <Button 
                    variant="danger" 
                    leftIcon={<TrashIcon className="w-5 h-5" />}
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
              </>
            )}
            
            <Link href={`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`}>
              <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                New RFI
              </Button>
            </Link>
          </div>
        </div>

        {/* Project Information Card */}
        <div className="card mb-5">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-steel-900">{project.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge-${project.status.toLowerCase().replace('_', '-')}`}>
                      {project.status === 'ACTIVE' && '🔄 Active'}
                      {project.status === 'COMPLETED' && '✅ Completed'}
                      {project.status === 'ON_HOLD' && '⏸️ On Hold'}
                      {project.status === 'CANCELLED' && '❌ Cancelled'}
                      {project.status === 'ARCHIVED' && '📦 Archived'}
                    </span>
                    {project.projectNumber && (
                      <span className="text-sm text-steel-600 font-mono">
                        #{project.projectNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-steel-200">
            {project.description && (
              <div className="mb-3">
                <p className="text-steel-700 text-sm leading-relaxed">{project.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {project.client && (
                <div className="flex items-start gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Client</p>
                    <p className="text-steel-900 font-medium">{project.client.name}</p>
                  </div>
                </div>
              )}

              {project.manager && (
                <div className="flex items-start gap-2">
                  <UserIcon className="w-4 h-4 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Manager</p>
                    <p className="text-steel-900 font-medium">{project.manager.name}</p>
                  </div>
                </div>
              )}

              {project.startDate && (
                <div className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Start Date</p>
                    <p className="text-steel-900 font-medium">
                      {format(new Date(project.startDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RFI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <DocumentTextIcon className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total</p>
                  <p className="text-xl font-bold text-steel-900">{rfiStats.total}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-yellow text-steel-900">
                  <span className="text-sm font-bold">⏳</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Open</p>
                  <p className="text-xl font-bold text-steel-900">{rfiStats.open}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <span className="text-sm font-bold">🔄</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Draft</p>
                  <p className="text-xl font-bold text-steel-900">{rfiStats.draft}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <span className="text-sm font-bold">✅</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Closed</p>
                  <p className="text-xl font-bold text-steel-900">{rfiStats.closed}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-red text-white">
                  <span className="text-sm font-bold">⚠️</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Overdue</p>
                  <p className="text-xl font-bold text-steel-900">{rfiStats.overdue}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stakeholders Section */}
        <div className="mb-8">
          <StakeholderList
            stakeholders={stakeholders}
            availableContacts={contacts || []}
            isLoading={stakeholdersLoading || contactsLoading}
            onAdd={addStakeholder}
            onRemove={removeStakeholder}
            projectName={project.name}
          />
        </div>

        {/* RFI List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-bold text-steel-900">Project RFIs</h3>
          </div>
          
          <div className="p-4">
            {rfisLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-steel-200 rounded"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-steel-200 rounded w-3/4"></div>
                        <div className="h-2 bg-steel-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rfis.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-8 h-8 text-steel-400 mx-auto mb-3" />
                <p className="text-steel-500 mb-3 text-sm">No RFIs found for this project</p>
                <Link href={`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`}>
                  <Button variant="primary" leftIcon={<PlusIcon className="w-4 h-4" />}>
                    Create first RFI
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {rfis.map((rfi) => (
                  <div key={rfi.id} className="list-item">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-semibold text-steel-900 truncate">
                            <span className="text-orange-600 font-mono text-sm">{rfi.rfiNumber}</span>
                            <span className="ml-2">{rfi.title}</span>
                          </h4>
                          <StatusBadge status={rfi.status} />
                          <PriorityBadge priority={rfi.priority} />
                        </div>
                        <p className="text-steel-600 text-sm line-clamp-2 mb-1">
                          {rfi.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm text-steel-500">
                          <span>Created {formatDistanceToNow(new Date(rfi.createdAt))} ago</span>
                          {rfi.createdBy && (
                            <span>by {rfi.createdBy.name}</span>
                          )}
                          {rfi.dateNeededBy && (
                            <span>
                              • Due {format(new Date(rfi.dateNeededBy), 'MMM d')}
                              {new Date(rfi.dateNeededBy) < new Date() && rfi.status !== 'CLOSED' && (
                                <span className="text-safety-red font-medium"> (Overdue)</span>
                              )}
                            </span>
                          )}
                          {rfi._count?.responses && (
                            <span>• {rfi._count.responses} responses</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Link href={`/dashboard/rfis/${rfi.id}`}>
                          <Button variant="primary" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            Please type <strong>{project?.name}</strong> to confirm deletion:
          </p>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Project name"
            onChange={(e) => {
              const deleteButton = document.getElementById('delete-confirm-button') as HTMLButtonElement
              if (deleteButton) {
                deleteButton.disabled = e.target.value !== project?.name || isDeleting
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
              id="delete-confirm-button"
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