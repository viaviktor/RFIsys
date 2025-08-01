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
import { SmartNav } from '@/components/ui/ContextualNav'
import { QuickNav, ClientLink, RFILink } from '@/components/ui/EntityLinks'
import { EntityGrid, RFICard } from '@/components/ui/EntityCards'
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
  TrashIcon,
  ClockIcon,
  CheckCircleIcon
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

  // Prepare navigation actions
  const navActions = [
    {
      label: 'Edit Project',
      onClick: () => router.push(`/dashboard/projects/${project.id}/edit`),
      variant: 'outline' as const,
      icon: <PencilIcon className="w-4 h-4" />,
    },
    {
      label: 'New RFI',
      onClick: () => router.push(`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`),
      variant: 'primary' as const,
      icon: <PlusIcon className="w-4 h-4" />,
    },
  ]

  // Add archive/delete actions if user can manage
  if (canManageProject) {
    if (project.status === 'ARCHIVED') {
      navActions.push({
        label: isUnarchiving ? 'Unarchiving...' : 'Unarchive',
        onClick: () => setShowUnarchiveModal(true),
        variant: 'outline' as const,
        icon: <ArchiveBoxXMarkIcon className="w-4 h-4" />,
      })
    } else {
      navActions.push({
        label: isArchiving ? 'Archiving...' : 'Archive',
        onClick: () => setShowArchiveModal(true),
        variant: 'outline' as const,
        icon: <ArchiveBoxIcon className="w-4 h-4" />,
      })
    }
    
    if (user?.role === 'ADMIN') {
      navActions.push({
        label: isDeleting ? 'Deleting...' : 'Delete',
        onClick: () => setShowDeleteModal(true),
        variant: 'outline' as const,
        icon: <TrashIcon className="w-4 h-4" />,
      })
    }
  }

  // Prepare quick nav items
  const quickNavItems = []
  if (project.client) {
    quickNavItems.push({
      type: 'client' as const,
      id: project.client.id,
      label: project.client.name,
    })
  }
  
  // Add recent RFIs to quick nav
  rfis.slice(0, 5).forEach(rfi => {
    quickNavItems.push({
      type: 'rfi' as const,
      id: rfi.id,
      label: rfi.rfiNumber || `RFI ${rfi.id.slice(0, 8)}`,
    })
  })

  return (
    <DashboardLayout>
      {/* Smart Navigation */}
      <SmartNav 
        entityType="project"
        entityId={project.id}
        entityData={project}
      />
      
      <div className="page-container">

        {/* Project Overview Card */}
        <div className="card mb-6">
          <div className="card-body">
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
            
            {project.description && (
              <div className="mt-4">
                <p className="text-steel-700 leading-relaxed">{project.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {project.client && (
                <div className="flex items-start gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-steel-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-steel-600">Client</p>
                    <ClientLink clientId={project.client.id} clientName={project.client.name}>
                      {project.client.name}
                    </ClientLink>
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
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total RFIs</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiStats.total}</p>
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
                  <p className="text-sm font-medium text-steel-600">Open</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiStats.open}</p>
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
                  <p className="text-sm font-medium text-steel-600">Draft</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiStats.draft}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Closed</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiStats.closed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Stakeholders Section */}
            <div className="mb-6">
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
                <h3 className="text-lg font-semibold text-steel-900">Project RFIs</h3>
              </div>
              <div className="card-body">
                {rfisLoading ? (
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
                ) : rfis.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-500 mb-4">No RFIs found for this project</p>
                    <Link href={`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`}>
                      <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                        Create first RFI
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <EntityGrid columns={2}>
                    {rfis.map((rfi) => (
                      <RFICard 
                        key={rfi.id}
                        rfi={rfi}
                        onClick={() => router.push(`/dashboard/rfis/${rfi.id}`)}
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
            {/* Quick Navigation */}
            {quickNavItems.length > 0 && (
              <QuickNav 
                items={quickNavItems}
                title="Quick Navigation"
              />
            )}

            {/* Project Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Project Actions</h3>
                <div className="space-y-3">
                  <Link href={`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                      Create New RFI
                    </Button>
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}/edit`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PencilIcon className="w-4 h-4" />}
                    >
                      Edit Project
                    </Button>
                  </Link>
                  {project.client && (
                    <Link href={`/dashboard/clients/${project.client.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}
                      >
                        View Client
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Recent RFIs */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent RFIs</h3>
                <div className="space-y-3">
                  {rfis.slice(0, 5).map(rfi => (
                    <Link key={rfi.id} href={`/dashboard/rfis/${rfi.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-steel-900 text-sm">{rfi.rfiNumber}</p>
                          <StatusBadge status={rfi.status} />
                        </div>
                        <p className="text-sm text-steel-600 line-clamp-1">{rfi.title}</p>
                        <p className="text-xs text-steel-500 mt-1">
                          {formatDistanceToNow(new Date(rfi.createdAt))} ago
                        </p>
                      </div>
                    </Link>
                  ))}
                  {rfis.length === 0 && (
                    <p className="text-sm text-steel-500 text-center py-4">No RFIs yet</p>
                  )}
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