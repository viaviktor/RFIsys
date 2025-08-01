'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFIs } from '@/hooks/useRFIs'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { DashboardStatsSkeleton, RFIListSkeleton } from '@/components/ui/Skeleton'
import { RFIFilters } from '@/components/filters/RFIFilters'
import { RFIFilters as RFIFiltersType } from '@/types'
import { 
  PlusIcon, 
  ArrowRightIcon, 
  DocumentArrowDownIcon, 
  BuildingOfficeIcon,
  FolderIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { apiClient, downloadFile } from '@/lib/api'
import Link from 'next/link'
import { Tooltip, TimeAgoTooltip } from '@/components/ui/Tooltip'
import { RFIQuickView } from '@/components/ui/Modal'
import { RFIActionMenu } from '@/components/ui/Dropdown'
import { RFICard } from '@/components/ui/EntityCards'

export function InternalDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [filters, setFilters] = useState<RFIFiltersType>({})
  const [selectedRFIs, setSelectedRFIs] = useState<Set<string>>(new Set())
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [quickViewRFI, setQuickViewRFI] = useState<any>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  const { rfis, isLoading: rfisLoading, error, refresh } = useRFIs({
    page: 1,
    limit: 20,
    filters,
  })

  const { projects, isLoading: projectsLoading } = useProjects({ limit: 5 })
  const { clients, isLoading: clientsLoading } = useClients({ limit: 5 })

  const handleFiltersChange = (newFilters: RFIFiltersType) => {
    setFilters(newFilters)
  }

  const handleExportSelectedPDFs = async () => {
    if (selectedRFIs.size === 0) {
      alert('Please select at least one RFI to export.')
      return
    }

    setIsExportingPDF(true)
    try {
      const ids = Array.from(selectedRFIs)
      const pdfBlob = await apiClient.exportRFIsPDF(ids)
      downloadFile(pdfBlob, `RFIs-Export-${new Date().toISOString().split('T')[0]}.pdf`)
      setSelectedRFIs(new Set())
    } catch (error) {
      console.error('Failed to export PDFs:', error)
      alert('Failed to export PDFs. Please try again.')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleSelectRFI = (rfiId: string) => {
    const newSelected = new Set(selectedRFIs)
    if (newSelected.has(rfiId)) {
      newSelected.delete(rfiId)
    } else {
      newSelected.add(rfiId)
    }
    setSelectedRFIs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRFIs.size === rfis?.length) {
      setSelectedRFIs(new Set())
    } else {
      setSelectedRFIs(new Set(rfis?.map(rfi => rfi.id) || []))
    }
  }

  // Calculate stats
  const stats = {
    totalRFIs: rfis?.length || 0,
    openRFIs: rfis?.filter(r => r.status === 'OPEN').length || 0,
    overdueRFIs: rfis?.filter(r => 
      r.dateNeededBy && new Date(r.dateNeededBy) < new Date() && r.status === 'OPEN'
    ).length || 0,
    urgentRFIs: rfis?.filter(r => r.priority === 'URGENT' || r.urgency === 'URGENT').length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-steel-900 mb-2">
              Welcome back, {user?.name}
            </h1>
            <p className="text-steel-600">
              Here's an overview of your RFI system
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/rfis/new">
              <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                New RFI
              </Button>
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/dashboard/admin/users">
                <Button variant="outline">Admin Panel</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Total RFIs</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.totalRFIs}</p>
            </div>
            <DocumentTextIcon className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Open RFIs</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.openRFIs}</p>
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

        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-steel-600">Urgent</p>
              <p className="text-3xl font-bold text-steel-900 mt-2">{stats.urgentRFIs}</p>
            </div>
            <ExclamationTriangleIcon className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* RFI Filters and List */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="p-6 border-b border-steel-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-steel-900">Recent RFIs</h2>
                <div className="flex items-center gap-3">
                  {selectedRFIs.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportSelectedPDFs}
                      isLoading={isExportingPDF}
                      leftIcon={<DocumentArrowDownIcon className="w-4 h-4" />}
                    >
                      Export {selectedRFIs.size} PDF{selectedRFIs.size > 1 ? 's' : ''}
                    </Button>
                  )}
                  <Link href="/dashboard/rfis">
                    <Button variant="ghost" size="sm">
                      View All <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <RFIFilters 
                filters={filters} 
                onFiltersChange={handleFiltersChange}
                onClearFilters={() => setFilters({})}
              />
            </div>

            <div className="p-6">
              {rfisLoading ? (
                <RFIListSkeleton />
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  Error loading RFIs: {error.message}
                </div>
              ) : rfis && rfis.length > 0 ? (
                <div className="space-y-4">
                  {rfis.slice(0, 5).map((rfi) => (
                    <div key={rfi.id} className="relative">
                      <input
                        type="checkbox"
                        className="absolute top-4 left-4 z-10"
                        checked={selectedRFIs.has(rfi.id)}
                        onChange={() => handleSelectRFI(rfi.id)}
                      />
                      <RFICard 
                        rfi={rfi}
                        onClick={() => router.push(`/dashboard/rfis/${rfi.id}`)}
                        className="pl-12"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-steel-500">
                  No RFIs found matching your filters
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
            <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/dashboard/projects/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FolderIcon className="w-5 h-5 mr-2" />
                  New Project
                </Button>
              </Link>
              <Link href="/dashboard/clients/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                  New Client
                </Button>
              </Link>
              <Link href="/dashboard/rfis/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  New RFI
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900">Recent Projects</h3>
              <Link href="/dashboard/projects">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {projectsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-steel-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                    <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                      <p className="font-medium text-steel-900">{project.name}</p>
                      <p className="text-sm text-steel-600">{project.client?.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-steel-500 text-sm">No projects yet</p>
            )}
          </div>

          {/* Recent Clients */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900">Recent Clients</h3>
              <Link href="/dashboard/clients">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {clientsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-steel-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : clients && clients.length > 0 ? (
              <div className="space-y-3">
                {clients.map((client) => (
                  <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                    <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                      <p className="font-medium text-steel-900">{client.name}</p>
                      <p className="text-sm text-steel-600">{client.contactName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-steel-500 text-sm">No clients yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <RFIQuickView
        rfi={quickViewRFI}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false)
          setQuickViewRFI(null)
        }}
      />
    </div>
  )
}