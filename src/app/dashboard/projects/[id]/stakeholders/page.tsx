'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProject } from '@/hooks/useProjects'
import { useStakeholders } from '@/hooks/useStakeholders'
import { useContacts } from '@/hooks/useContacts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StakeholderList } from '@/components/stakeholders/StakeholderList'
import { SmartNav } from '@/components/ui/ContextualNav'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ProjectStakeholdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const { project, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const { stakeholders, isLoading: stakeholdersLoading, addStakeholder, removeStakeholder } = useStakeholders(projectId)
  const { contacts, isLoading: contactsLoading } = useContacts(project?.clientId || '')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

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

  // Calculate stakeholder stats
  const stakeholderStats = {
    total: stakeholders.length,
    level1: stakeholders.filter(s => s.stakeholderLevel === 1).length,
    level2: stakeholders.filter(s => s.stakeholderLevel === 2).length,
    registered: stakeholders.filter(s => s.contact.password !== null).length,
  }

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
                  <UserGroupIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-steel-900">{project.name}</h2>
                  <p className="text-steel-600 mt-1">Stakeholder Management</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href={`/dashboard/projects/${project.id}`}>
                  <Button variant="outline" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                    Back to Project
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
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Stakeholders</p>
                  <p className="text-2xl font-bold text-steel-900">{stakeholderStats.total}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-blue text-white">
                  <BuildingOfficeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Level 1 (Clients)</p>
                  <p className="text-2xl font-bold text-steel-900">{stakeholderStats.level1}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-yellow text-steel-900">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Level 2 (Sub-contractors)</p>
                  <p className="text-2xl font-bold text-steel-900">{stakeholderStats.level2}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Registered</p>
                  <p className="text-2xl font-bold text-steel-900">{stakeholderStats.registered}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Stakeholder Management */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-steel-900">Project Stakeholders</h3>
                    <p className="text-steel-600 text-sm">Manage who can access and respond to RFIs for this project</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <StakeholderList
                  stakeholders={stakeholders}
                  availableContacts={contacts || []}
                  isLoading={stakeholdersLoading || contactsLoading}
                  onAdd={addStakeholder}
                  onRemove={removeStakeholder}
                  projectName={project.name}
                />
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
                  <Link href={`/dashboard/clients/${project.clientId}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}
                    >
                      Manage Client Contacts
                    </Button>
                  </Link>
                  <Link href={`/dashboard/rfis/new?projectId=${project.id}&clientId=${project.clientId}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                      Create New RFI
                    </Button>
                  </Link>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    >
                      Back to Project
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stakeholder Information */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Stakeholder Levels</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-steel-900 mb-2">Level 1 (Client Admins)</h4>
                    <ul className="text-sm text-steel-600 space-y-1">
                      <li>• Can view and respond to all project RFIs</li>
                      <li>• Can invite Level 2 stakeholders</li>
                      <li>• Receive all RFI notifications</li>
                      <li>• Full project access</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-steel-900 mb-2">Level 2 (Sub-contractors)</h4>
                    <ul className="text-sm text-steel-600 space-y-1">
                      <li>• Can view assigned project RFIs</li>
                      <li>• Can respond to relevant RFIs</li>
                      <li>• Limited project access</li>
                      <li>• Must be invited by Level 1</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Status */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Registration Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-600">Total Stakeholders:</span>
                    <span className="font-medium">{stakeholderStats.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-600">Registered:</span>
                    <span className="font-medium text-green-600">{stakeholderStats.registered}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-600">Pending:</span>
                    <span className="font-medium text-yellow-600">
                      {stakeholderStats.total - stakeholderStats.registered}
                    </span>
                  </div>
                  
                  {stakeholderStats.total > 0 && (
                    <div className="pt-2 border-t border-steel-200">
                      <div className="w-full bg-steel-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{
                            width: `${(stakeholderStats.registered / stakeholderStats.total) * 100}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-steel-500 mt-1">
                        {Math.round((stakeholderStats.registered / stakeholderStats.total) * 100)}% registered
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}