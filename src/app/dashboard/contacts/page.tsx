'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { InviteStakeholderForm } from '@/components/forms/InviteStakeholderForm'
import { InvitedStakeholdersList } from '@/components/stakeholders/InvitedStakeholdersList'
import { 
  PlusIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ContactsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [refreshInvitations, setRefreshInvitations] = useState(0)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!user) return

    // Only L1 stakeholders and internal users can access this page
    if (user.userType === 'stakeholder' && user.role !== 'STAKEHOLDER_L1') {
      router.push('/dashboard')
      return
    }

    fetchProjects()
  }, [user, router])

  const fetchProjects = async () => {
    try {
      setIsLoadingProjects(true)
      const response = await fetch('/api/projects?limit=100')
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])
      
      // Set first project as default if available
      if (data.projects && data.projects.length > 0) {
        setSelectedProjectId(data.projects[0].id)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-steel-600">Loading...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Check access
  if (user.userType === 'stakeholder' && user.role !== 'STAKEHOLDER_L1') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-steel-100 rounded-lg transition-colors">
                <ArrowLeftIcon className="w-5 h-5 text-steel-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-steel-900">Team Members</h1>
              <p className="text-steel-600 mt-1">
                {user.userType === 'internal' 
                  ? 'Manage team members and stakeholders across all projects'
                  : 'Invite Level 2 stakeholders to collaborate on your projects'
                }
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => setShowInviteModal(true)}
            disabled={projects.length === 0}
          >
            Invite Team Member
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Project Selection for Invitations */}
          {projects.length > 0 && (
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
              <h2 className="text-lg font-semibold text-steel-900 mb-4">
                Select Project for New Invitations
              </h2>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full md:w-auto rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.projectNumber && `(#${project.projectNumber})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Invited Team Members List */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="p-6 border-b border-steel-200">
              <div className="flex items-center gap-3">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
                <h2 className="text-lg font-semibold text-steel-900">
                  Invited Team Members
                </h2>
              </div>
            </div>
            <div className="p-6">
              {isLoadingProjects ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-steel-100 rounded-lg"></div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="w-12 h-12 text-steel-400 mx-auto mb-3" />
                  <p className="text-steel-600">No projects available</p>
                  <p className="text-sm text-steel-500 mt-2">
                    {user.userType === 'internal' 
                      ? 'Create a project first to invite team members'
                      : 'You need to be assigned to a project to invite team members'
                    }
                  </p>
                </div>
              ) : (
                <InvitedStakeholdersList key={refreshInvitations} />
              )}
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invite Team Member"
        >
          {selectedProjectId && projects.length > 0 && (
            <InviteStakeholderForm
              projectId={selectedProjectId}
              projectName={projects.find(p => p.id === selectedProjectId)?.name || ''}
              onSuccess={() => {
                setShowInviteModal(false)
                setRefreshInvitations(prev => prev + 1)
              }}
              onCancel={() => setShowInviteModal(false)}
            />
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}