'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { 
  CircleStackIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { downloadFile } from '@/lib/api'

interface ExportJob {
  id: string
  type: string
  format: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  downloadUrl?: string
  error?: string
}

export default function AdminDataPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!isLoading && isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading) {
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
    return null
  }

  const handleExport = async (type: string, format: 'json' | 'csv' = 'json', filters: any = {}) => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, format, filters }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export data')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.${format}`

      const blob = await response.blob()
      downloadFile(blob, filename)

      // Add to export jobs list (simulated for now)
      const newJob: ExportJob = {
        id: Date.now().toString(),
        type,
        format,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      setExportJobs(prev => [newJob, ...prev.slice(0, 9)]) // Keep last 10 jobs

    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const exportOptions = [
    {
      id: 'users',
      name: 'Users',
      description: 'Export all user accounts and their information',
      icon: UserGroupIcon,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'clients',
      name: 'Clients',
      description: 'Export all client companies and contact information',
      icon: BuildingOfficeIcon,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'projects',
      name: 'Projects',
      description: 'Export all projects with client relationships',
      icon: Squares2X2Icon,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'rfis',
      name: 'RFIs',
      description: 'Export all RFIs with responses and attachments metadata',
      icon: DocumentTextIcon,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Export system configuration settings',
      icon: CogIcon,
      color: 'bg-gray-100 text-gray-600',
    },
  ]

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CircleStackIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-steel-900">Data Management</h1>
                <p className="text-steel-600 font-medium">
                  Export and backup system data
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Options */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">Data Export</h3>
                <p className="text-sm text-steel-600">
                  Export specific data types in JSON or CSV format
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {exportOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-4 border border-steel-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-medium text-steel-900">{option.name}</h4>
                            <p className="text-sm text-steel-600">{option.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(option.id, 'csv')}
                            disabled={isExporting}
                          >
                            CSV
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleExport(option.id, 'json')}
                            disabled={isExporting}
                          >
                            JSON
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Full Backup */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">Full System Backup</h3>
                <p className="text-sm text-steel-600">
                  Complete system backup including all data and settings
                </p>
              </div>
              <div className="card-body">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Important Notes</h4>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Full backup includes all users, clients, projects, RFIs, and settings</li>
                    <li>• File attachments are not included in the backup</li>
                    <li>• Passwords are excluded for security</li>
                    <li>• Large exports may take several minutes</li>
                  </ul>
                </div>
                <Button
                  variant="primary"
                  leftIcon={<DocumentArrowDownIcon className="w-5 h-5" />}
                  onClick={() => handleExport('full-backup', 'json')}
                  disabled={isExporting}
                  className="w-full"
                >
                  {isExporting ? 'Creating Backup...' : 'Create Full Backup'}
                </Button>
              </div>
            </div>
          </div>

          {/* Export History & Statistics */}
          <div className="space-y-6">
            {/* System Statistics */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">System Statistics</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">---</div>
                    <div className="text-sm text-blue-800">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">---</div>
                    <div className="text-sm text-green-800">Active Clients</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">---</div>
                    <div className="text-sm text-purple-800">Active Projects</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">---</div>
                    <div className="text-sm text-orange-800">Total RFIs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Export Jobs */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">Recent Exports</h3>
              </div>
              <div className="card-body">
                {exportJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentArrowDownIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                    <p className="text-steel-600">No recent exports</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exportJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 border border-steel-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-steel-900">
                            {exportOptions.find(opt => opt.id === job.type)?.name || job.type} Export
                          </div>
                          <div className="text-sm text-steel-600">
                            {new Date(job.createdAt).toLocaleString()} • {job.format.toUpperCase()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data Import (Future Enhancement) */}
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 opacity-50">
              <div className="card-header">
                <h3 className="text-xl font-bold text-steel-900">Data Import</h3>
                <p className="text-sm text-steel-600">
                  Import data from external sources (Coming Soon)
                </p>
              </div>
              <div className="card-body">
                <div className="text-center py-8">
                  <CircleStackIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                  <p className="text-steel-600">Data import functionality will be available in a future update</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}