'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFI, useUpdateRFI } from '@/hooks/useRFIs'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SmartNav } from '@/components/ui/ContextualNav'
import { ArrowLeftIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RFI, RFIStatus, Priority, PRIORITY_LABELS, STATUS_LABELS } from '@/types'
import Link from 'next/link'

const rfiSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  suggestedSolution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED'] as const),
  dateNeededBy: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().min(1, 'Project is required'),
})

type RFIForm = z.infer<typeof rfiSchema>

export default function RFIEditPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const rfiId = params.id as string
  
  const { rfi, isLoading: rfiLoading, error: rfiError } = useRFI(rfiId)
  const { updateRFI, isUpdating } = useUpdateRFI()
  const { clients, isLoading: clientsLoading } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const { projects, isLoading: projectsLoading } = useProjects({
    clientId: selectedClientId || undefined
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RFIForm>({
    resolver: zodResolver(rfiSchema),
  })

  const watchedClientId = watch('clientId')
  const watchedProjectId = watch('projectId')

  // Set form values when RFI loads
  useEffect(() => {
    if (rfi) {
      setValue('title', rfi.title)
      setValue('description', rfi.description)
      setValue('suggestedSolution', rfi.suggestedSolution || '')
      setValue('priority', rfi.priority)
      setValue('status', rfi.status)
      setValue('clientId', rfi.clientId)
      setValue('projectId', rfi.projectId)
      setValue('dateNeededBy', rfi.dateNeededBy ? new Date(rfi.dateNeededBy).toISOString().split('T')[0] : '')
      setSelectedClientId(rfi.clientId)
    }
  }, [rfi, setValue])

  // Update selected client when form client changes
  useEffect(() => {
    if (watchedClientId && watchedClientId !== selectedClientId) {
      setSelectedClientId(watchedClientId)
      // Clear project selection when client changes
      if (watchedProjectId) {
        setValue('projectId', '')
      }
    }
  }, [watchedClientId, selectedClientId, watchedProjectId, setValue])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const onSubmit = async (data: RFIForm) => {
    if (!rfiId) return
    
    try {
      const updateData = {
        ...data,
        dateNeededBy: data.dateNeededBy ? new Date(data.dateNeededBy).toISOString() : undefined,
      }
      
      await updateRFI(rfiId, updateData)
      router.push(`/dashboard/rfis/${rfiId}`)
    } catch (error) {
      console.error('Failed to update RFI:', error)
    }
  }

  if (authLoading || rfiLoading || clientsLoading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-steel-600">Loading RFI details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (rfiError) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">Error</h2>
              <p className="text-steel-600 mb-6">Failed to load RFI: {rfiError.message}</p>
              <Link href="/dashboard/rfis">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to RFIs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!rfi) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-steel-900 mb-4">RFI Not Found</h2>
              <p className="text-steel-600 mb-6">The requested RFI could not be found.</p>
              <Link href="/dashboard/rfis">
                <Button variant="primary" leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
                  Back to RFIs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Filter projects for selected client
  const clientProjects = projects.filter(project => project.clientId === watchedClientId)

  return (
    <DashboardLayout>
      {/* Smart Navigation Header */}
      <SmartNav 
        entityType="rfi"
        entityId={rfiId}
        entityData={rfi}
      />
      
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href={`/dashboard/rfis/${rfiId}`}>
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  Back to RFI
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">
              Edit RFI
            </h1>
            <p className="text-steel-600 font-medium">
              {rfi.rfiNumber} - {rfi.title}
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="card-header">
              <h2 className="text-xl font-bold text-steel-900">RFI Details</h2>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-steel-700 mb-2">
                    Title *
                  </label>
                  <Input
                    id="title"
                    {...register('title')}
                    placeholder="Enter RFI title"
                    error={errors.title?.message}
                  />
                </div>

                {/* Client and Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-steel-700 mb-2">
                      Client *
                    </label>
                    <Select
                      {...register('clientId')}
                      error={errors.clientId?.message}
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="projectId" className="block text-sm font-medium text-steel-700 mb-2">
                      Project *
                    </label>
                    <Select
                      {...register('projectId')}
                      disabled={!watchedClientId || projectsLoading}
                      error={errors.projectId?.message}
                    >
                      <option value="">
                        {!watchedClientId ? 'Select a client first' : 'Select a project'}
                      </option>
                      {clientProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectNumber ? `${project.projectNumber} - ` : ''}{project.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Priority and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-steel-700 mb-2">
                      Priority *
                    </label>
                    <Select
                      {...register('priority')}
                      error={errors.priority?.message}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-steel-700 mb-2">
                      Status *
                    </label>
                    <Select
                      {...register('status')}
                      error={errors.status?.message}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Date Needed By */}
                <div>
                  <label htmlFor="dateNeededBy" className="block text-sm font-medium text-steel-700 mb-2">
                    Date Needed By
                  </label>
                  <Input
                    id="dateNeededBy"
                    type="date"
                    {...register('dateNeededBy')}
                    error={errors.dateNeededBy?.message}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-steel-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    {...register('description')}
                    rows={6}
                    placeholder="Describe the request for information in detail..."
                    className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-safety-red">{errors.description.message}</p>
                  )}
                </div>

                {/* Suggested Solution */}
                <div>
                  <label htmlFor="suggestedSolution" className="block text-sm font-medium text-steel-700 mb-2">
                    Suggested Solution
                  </label>
                  <textarea
                    id="suggestedSolution"
                    {...register('suggestedSolution')}
                    rows={4}
                    placeholder="Optional: Suggest a potential solution or approach..."
                    className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-steel-200">
                  <Link href={`/dashboard/rfis/${rfiId}`}>
                    <Button variant="outline" disabled={isUpdating}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isUpdating}
                    disabled={isUpdating}
                    leftIcon={<DocumentCheckIcon className="w-4 h-4" />}
                  >
                    Update RFI
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}