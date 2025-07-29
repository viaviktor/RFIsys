'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/providers/AuthProvider'
import { useCreateProject } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  projectNumber: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
  notes: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

export default function NewProjectPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { createProject, isCreating, error: createError } = useCreateProject()
  const { clients } = useClients({ active: true })
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      projectNumber: '',
      clientId: '',
      managerId: '',
      startDate: '',
      endDate: '',
      status: 'ACTIVE' as const,
      notes: '',
    },
  })

  // Fetch users for manager selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          credentials: 'include',
        })
        if (response.ok) {
          const userData = await response.json()
          setUsers(userData.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }

    if (isAuthenticated) {
      fetchUsers()
    }
  }, [isAuthenticated])

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const projectData = {
        ...data,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        managerId: data.managerId || undefined,
        active: true,
      }

      const project = await createProject(projectData)
      router.push(`/dashboard/projects/${project.id}`)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create project',
      })
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/dashboard/projects')
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

  if (!isAuthenticated || !user) {
    router.replace('/login')
    return null
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
              New Project
            </h1>
            <p className="text-steel-600 font-medium">
              Create a new construction project
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-steel-900">Create New Project</h2>
                <p className="text-steel-600">
                  Add a new construction project to your system
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Form Errors */}
              {(errors.root || createError) && (
                <div className="alert-error">
                  <div className="font-medium">
                    {errors.root?.message || createError?.message}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Project Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Project Name"
                      placeholder="Enter project name"
                      required
                      {...register('name')}
                      error={errors.name?.message}
                      disabled={isCreating}
                    />

                    <Input
                      label="Project Number"
                      placeholder="Enter project number (optional)"
                      {...register('projectNumber')}
                      error={errors.projectNumber?.message}
                      disabled={isCreating}
                    />

                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-2">
                      Client <span className="text-safety-red">*</span>
                    </label>
                    <select
                      {...register('clientId')}
                      disabled={isCreating}
                      className="w-full rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {errors.clientId && (
                      <p className="text-sm text-safety-red mt-1">{errors.clientId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-2">
                      Project Manager
                    </label>
                    <select
                      {...register('managerId')}
                      disabled={isCreating}
                      className="w-full rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    >
                      <option value="">Select a manager (optional)</option>
                      {users
                        .filter(u => u.id !== user.id || user.role === 'MANAGER' || user.role === 'ADMIN')
                        .map((userItem) => (
                          <option key={userItem.id} value={userItem.id}>
                            {userItem.name} ({userItem.email})
                          </option>
                        ))}
                    </select>
                    {errors.managerId && (
                      <p className="text-sm text-safety-red mt-1">{errors.managerId.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Project Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register('status')}
                      disabled={isCreating}
                      className="w-full rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <Input
                    type="date"
                    label="Start Date"
                    {...register('startDate')}
                    error={errors.startDate?.message}
                    disabled={isCreating}
                  />

                  <Input
                    type="date"
                    label="End Date"
                    {...register('endDate')}
                    error={errors.endDate?.message}
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-steel-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Enter project description (optional)"
                  className="w-full rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  {...register('description')}
                  disabled={isCreating}
                />
                {errors.description && (
                  <p className="text-sm text-safety-red mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-steel-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Enter any additional notes about this project (optional)"
                  className="w-full rounded-md border-steel-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  {...register('notes')}
                  disabled={isCreating}
                />
                {errors.notes && (
                  <p className="text-sm text-safety-red mt-1">{errors.notes.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-steel-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                  isLoading={isCreating}
                >
                  {isCreating ? 'Creating Project...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}