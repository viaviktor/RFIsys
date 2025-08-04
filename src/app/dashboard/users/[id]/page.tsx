'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SmartNav } from '@/components/ui/ContextualNav'
import { EntityGrid } from '@/components/ui/EntityCards'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import useSWR from 'swr'

interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
  userType: 'internal' | 'stakeholder'
  clientName?: string
  projectCount?: number
  _count?: {
    rfisCreated: number
    responses: number
    projects: number
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

function UserDetailClient({ id }: { id: string }) {
  const router = useRouter()
  
  const { data: user, error, isLoading, mutate } = useSWR<User>(
    `/api/users?search=${id}`,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch user')
      const data = await response.json()
      // Find the specific user from the list
      const foundUser = data.data?.find((u: User) => u.id === id)
      if (!foundUser) throw new Error('User not found')
      return foundUser
    }
  )

  const [actionLoading, setActionLoading] = useState(false)

  const handleActivateDeactivate = async () => {
    if (!user) return
    
    setActionLoading(true)
    try {
      const action = user.active ? 'deactivate' : 'activate'
      const endpoint = user.userType === 'stakeholder' 
        ? `/api/admin/stakeholders/${user.id}/${action}`
        : `/api/admin/users/${user.id}/${action}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`)
      }

      toast.success(`User ${action}d successfully`)
      mutate()
    } catch (error) {
      console.error('Action error:', error)
      toast.error(`Failed to ${user.active ? 'deactivate' : 'activate'} user`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user) return
    
    setActionLoading(true)
    try {
      const endpoint = user.userType === 'stakeholder'
        ? `/api/admin/stakeholders/${user.id}/reset-password`
        : `/api/admin/users/${user.id}/reset-password`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to reset password')
      }

      toast.success('Password reset email sent')
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Failed to reset password')
    } finally {
      setActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !user) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">User Not Found</h2>
          <p className="text-red-600 mb-4">The requested user could not be found.</p>
          <Button
            variant="secondary"
            onClick={() => router.push('/dashboard/admin/users')}
          >
            Back to Users
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <SmartNav 
        entityType="user" 
        entityId={user.id} 
        entityData={user} 
      />
      
      <div className="page-container">
        <div className="space-y-8">
          {/* User Header */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-construction rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-steel-900">{user.name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={user.active ? 'success' : 'error'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={user.userType === 'internal' ? 'primary' : 'secondary'}>
                        {user.userType === 'internal' ? 'Internal User' : 'Stakeholder'}
                      </Badge>
                      <Badge variant="secondary">
                        {user.role === 'STAKEHOLDER_L1' ? 'L1 Stakeholder' :
                         user.role === 'STAKEHOLDER_L2' ? 'L2 Stakeholder' :
                         user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={user.active ? 'danger' : 'success'}
                    size="sm"
                    onClick={handleActivateDeactivate}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      user.active ? 'Deactivate' : 'Activate'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={actionLoading}
                  >
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="content-grid">
            {/* Main Content */}
            <div className="main-content space-y-6">
              {/* Contact Information */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-steel-900">Contact Information</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="w-5 h-5 text-steel-500" />
                      <div>
                        <p className="text-sm text-steel-500">Email</p>
                        <p className="font-medium text-steel-900">{user.email}</p>
                      </div>
                    </div>
                    
                    {user.clientName && (
                      <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-steel-500" />
                        <div>
                          <p className="text-sm text-steel-500">Client</p>
                          <p className="font-medium text-steel-900">{user.clientName}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-steel-500" />
                      <div>
                        <p className="text-sm text-steel-500">Created</p>
                        <p className="font-medium text-steel-900">
                          {formatDateTime(new Date(user.createdAt))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-5 h-5 text-steel-500" />
                      <div>
                        <p className="text-sm text-steel-500">Role</p>
                        <p className="font-medium text-steel-900">
                          {user.role === 'STAKEHOLDER_L1' ? 'Level 1 Stakeholder' :
                           user.role === 'STAKEHOLDER_L2' ? 'Level 2 Stakeholder' :
                           user.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              {user._count && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-semibold text-steel-900">Activity Statistics</h2>
                  </div>
                  <div className="card-body">
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="card-body flex items-center justify-between">
                          <div className="stat-icon-primary">
                            <DocumentTextIcon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-steel-600">RFIs Created</p>
                            <p className="text-2xl font-bold text-steel-900">{user._count.rfisCreated}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="stat-card">
                        <div className="card-body flex items-center justify-between">
                          <div className="stat-icon-secondary">
                            <ChatBubbleLeftIcon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-steel-600">Responses</p>
                            <p className="text-2xl font-bold text-steel-900">{user._count.responses}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="stat-card">
                        <div className="card-body flex items-center justify-between">
                          <div className="stat-icon-primary">
                            <BuildingOfficeIcon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-steel-600">Projects</p>
                            <p className="text-2xl font-bold text-steel-900">{user._count.projects}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="sidebar-content space-y-6">
              {/* Quick Actions */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-steel-900">Quick Actions</h3>
                </div>
                <div className="card-body space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/admin/users')}
                    className="w-full justify-start"
                  >
                    View All Users
                  </Button>
                  
                  {user.userType === 'internal' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/rfis?createdBy=${user.id}`)}
                      className="w-full justify-start"
                    >
                      View RFIs Created
                    </Button>
                  )}
                  
                  {user.userType === 'stakeholder' && user.projectCount && user.projectCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/projects`)}
                      className="w-full justify-start"
                    >
                      View Projects ({user.projectCount})
                    </Button>
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

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params
  return <UserDetailClient id={id} />
}