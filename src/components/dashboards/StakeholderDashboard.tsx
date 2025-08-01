'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProjects } from '@/hooks/useProjects'
import { useRFIs } from '@/hooks/useRFIs'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { RFIFilters as RFIFiltersType } from '@/types'
import { ProjectCard, RFICard, EntityGrid } from '@/components/ui/EntityCards'
import { 
  DocumentTextIcon, 
  FolderIcon, 
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface StakeholderDashboardProps {
  userType: 'STAKEHOLDER_L1' | 'STAKEHOLDER_L2'
}

export function StakeholderDashboard({ userType }: StakeholderDashboardProps) {
  const { user } = useAuth()
  const [filters, setFilters] = useState<RFIFiltersType>({})
  
  // Fetch projects and RFIs
  const { projects, isLoading: projectsLoading } = useProjects({ limit: 100 })
  const { rfis, isLoading: rfisLoading } = useRFIs({ 
    page: 1, 
    limit: 10,
    filters: { ...filters, status: ['OPEN'] }
  })

  // Calculate stats
  const stats = {
    totalProjects: projects?.length || 0,
    openRFIs: rfis?.filter(r => r.status === 'OPEN').length || 0,
    pendingResponses: rfis?.filter(r => r.status === 'OPEN' && r._count?.responses === 0).length || 0,
    overdueRFIs: rfis?.filter(r => 
      r.dateNeededBy && new Date(r.dateNeededBy) < new Date() && r.status === 'OPEN'
    ).length || 0,
  }

  const recentRFIs = rfis?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
        <h1 className="text-2xl font-bold text-steel-900 mb-2">
          Welcome, {user?.name}
        </h1>
        <p className="text-steel-600">
          {userType === 'STAKEHOLDER_L1' 
            ? "You have access to manage RFIs and invite team members to your projects."
            : "You have access to view and respond to RFIs for your assigned project."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Your Projects</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.totalProjects}</p>
            </div>
            <FolderIcon className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Open RFIs</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.openRFIs}</p>
            </div>
            <DocumentTextIcon className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Awaiting Response</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.pendingResponses}</p>
            </div>
            <ClockIcon className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Overdue</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.overdueRFIs}</p>
            </div>
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="p-6 border-b border-steel-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-steel-900">Your Projects</h2>
                <Link href="/dashboard/projects">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {projectsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-steel-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.slice(0, 3).map((project) => (
                    <Link 
                      key={project.id} 
                      href={`/dashboard/projects/${project.id}`}
                      className="block"
                    >
                      <div className="p-4 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <h3 className="font-medium text-steel-900">{project.name}</h3>
                        <p className="text-sm text-steel-600 mt-1">
                          {project.projectNumber}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-steel-500">
                          <span className="flex items-center">
                            <DocumentTextIcon className="w-4 h-4 mr-1" />
                            {project._count?.rfis || 0} RFIs
                          </span>
                          {userType === 'STAKEHOLDER_L1' && (
                            <span className="flex items-center">
                              <UserGroupIcon className="w-4 h-4 mr-1" />
                              {project._count?.stakeholders || 0} stakeholders
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-steel-500 py-8">No projects assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent RFIs Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="p-6 border-b border-steel-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-steel-900">Recent RFIs</h2>
                <Link href="/dashboard/rfis">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {rfisLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-steel-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recentRFIs.length > 0 ? (
                <div className="space-y-4">
                  {recentRFIs.map((rfi) => (
                    <RFICard 
                      key={rfi.id} 
                      rfi={rfi}
                      onClick={() => window.location.href = `/dashboard/rfis/${rfi.id}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-steel-500 py-8">No RFIs found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* L1 Specific Features */}
      {userType === 'STAKEHOLDER_L1' && (
        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <h2 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/projects">
              <Button variant="outline" className="w-full justify-start">
                <FolderIcon className="w-5 h-5 mr-2" />
                Manage Projects
              </Button>
            </Link>
            <Link href="/dashboard/contacts">
              <Button variant="outline" className="w-full justify-start">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Invite Team Members
              </Button>
            </Link>
            <Link href="/dashboard/rfis">
              <Button variant="outline" className="w-full justify-start">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                View All RFIs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}