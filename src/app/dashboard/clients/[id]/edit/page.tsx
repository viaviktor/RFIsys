'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/providers/AuthProvider'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function EditClientPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const { client, isLoading: clientLoading, error: clientError } = useClient(clientId)
  const { updateClient, isUpdating, error: updateError } = useUpdateClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      notes: '',
      active: true,
    },
  })

  // Reset form when client data loads
  useEffect(() => {
    if (client) {
      reset({
        name: client.name || '',
        contactName: client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        country: client.country || 'USA',
        notes: client.notes || '',
        active: client.active !== false,
      })
    }
  }, [client, reset])

  const onSubmit = async (data: ClientFormData) => {
    try {
      const updateData = {
        ...data,
        country: data.country || 'USA',
      }
      await updateClient(clientId, updateData)
      router.push(`/dashboard/clients/${clientId}`)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to update client',
      })
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push(`/dashboard/clients/${clientId}`)
    }
  }

  if (authLoading || clientLoading) {
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

  if (clientError) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-xl font-bold text-steel-900 mb-2">Error</h2>
              <p className="text-steel-600 mb-4">Failed to load client: {clientError.message}</p>
              <Link href="/dashboard/clients">
                <Button>Back to Clients</Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-xl font-bold text-steel-900 mb-2">Client Not Found</h2>
              <p className="text-steel-600 mb-4">The requested client could not be found.</p>
              <Link href="/dashboard/clients">
                <Button>Back to Clients</Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href={`/dashboard/clients/${clientId}`}>
                <Button variant="outline" size="sm" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
                  Back to {client.name}
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">
              Edit Client
            </h1>
            <p className="text-steel-600 font-medium">
              Update client information and settings
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
                <h2 className="text-xl font-bold text-steel-900">Edit {client.name}</h2>
                <p className="text-steel-600">
                  Update client information and settings
                </p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Form Errors */}
              {(errors.root || updateError) && (
                <div className="alert-error">
                  <div className="font-medium">
                    {errors.root?.message || updateError?.message}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Client Name"
                      placeholder="Enter client/company name"
                      required
                      {...register('name')}
                      error={errors.name?.message}
                      disabled={isUpdating}
                    />

                    <Input
                      label="Primary Contact Name"
                      placeholder="Enter primary contact name"
                      required
                      {...register('contactName')}
                      error={errors.contactName?.message}
                      disabled={isUpdating}
                    />

                    <Input
                      type="email"
                      label="Email Address"
                      placeholder="Enter primary email address"
                      required
                      {...register('email')}
                      error={errors.email?.message}
                      disabled={isUpdating}
                    />

                    <Input
                      type="tel"
                      label="Phone Number"
                      placeholder="Enter phone number (optional)"
                      {...register('phone')}
                      error={errors.phone?.message}
                      disabled={isUpdating}
                    />
                  </div>
                </div>

              {/* Address Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Address Information
                </h3>
                
                <div className="space-y-6">
                  <Input
                    label="Street Address"
                    placeholder="Enter street address (optional)"
                    {...register('address')}
                    error={errors.address?.message}
                    disabled={isUpdating}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="City"
                      placeholder="Enter city (optional)"
                      {...register('city')}
                      error={errors.city?.message}
                      disabled={isUpdating}
                    />

                    <Input
                      label="State/Province"
                      placeholder="Enter state (optional)"
                      {...register('state')}
                      error={errors.state?.message}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="ZIP/Postal Code"
                      placeholder="Enter ZIP code (optional)"
                      {...register('zipCode')}
                      error={errors.zipCode?.message}
                      disabled={isUpdating}
                    />

                    <Input
                      label="Country"
                      placeholder="Enter country"
                      {...register('country')}
                      error={errors.country?.message}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Notes
                </h3>
                
                <div className="input-group">
                  <label htmlFor="notes" className="input-label">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    className={`input ${errors.notes ? 'input-error' : ''}`}
                    placeholder="Enter any additional notes about this client (optional)"
                    {...register('notes')}
                    disabled={isUpdating}
                  />
                  {errors.notes && (
                    <p className="input-error-text">{errors.notes.message}</p>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-steel-900 border-b border-steel-200 pb-2">
                  Status
                </h3>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    {...register('active')}
                    disabled={isUpdating}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-steel-300 rounded"
                  />
                  <div>
                    <label htmlFor="active" className="text-sm font-medium text-steel-900 cursor-pointer">
                      Active Client
                    </label>
                    <p className="text-sm text-steel-600 mt-1">
                      Inactive clients will be hidden from most views
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-steel-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating Client...' : 'Update Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}