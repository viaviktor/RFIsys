'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFIs } from '@/hooks/useRFIs'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { DashboardStatsSkeleton, RFIListSkeleton } from '@/components/ui/Skeleton'
import { RFIFilters } from '@/components/filters/RFIFilters'
import { RFIFilters as RFIFiltersType } from '@/types'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlusIcon, ArrowRightIcon, Squares2X2Icon, DocumentArrowDownIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { apiClient, downloadFile } from '@/lib/api'
import dynamic from 'next/dynamic'

const EmailTestButton = dynamic(() => import('@/components/email/EmailTestButton').then(mod => ({ default: mod.EmailTestButton })), {
  ssr: false,
  loading: () => <div></div>
})

import Link from 'next/link'
import { Tooltip, TimeAgoTooltip } from '@/components/ui/Tooltip'
import { RFIQuickView } from '@/components/ui/Modal'
import { RFIActionMenu } from '@/components/ui/Dropdown'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
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
      const rfiIds = Array.from(selectedRFIs)
      const blob = await apiClient.exportRFIsPDF(rfiIds)
      
      const filename = selectedRFIs.size === 1 
        ? `RFI-Export.pdf`
        : `RFI-Export-${new Date().toISOString().split('T')[0]}.zip`
      
      downloadFile(blob, filename)
      setSelectedRFIs(new Set()) // Clear selection after export
    } catch (error) {
      console.error('Failed to export PDFs:', error)
      alert('Failed to export PDFs. Please try again.')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleSelectRFI = (rfiId: string, selected: boolean) => {
    const newSelection = new Set(selectedRFIs)
    if (selected) {
      newSelection.add(rfiId)
    } else {
      newSelection.delete(rfiId)
    }
    setSelectedRFIs(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedRFIs.size === rfis.length) {
      setSelectedRFIs(new Set())
    } else {
      setSelectedRFIs(new Set(rfis.map(rfi => rfi.id)))
    }
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleQuickView = (rfi: any) => {
    setQuickViewRFI(rfi)
    setIsQuickViewOpen(true)
  }

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false)
    setQuickViewRFI(null)
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>
          
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Dashboard Header */}
        <div className="page-header">
          <div>
            <h1 className="text-3xl font-bold text-steel-900 mb-1">STEEL RFI DASHBOARD</h1>
            <p className="text-steel-600 font-medium">
              Heavy-duty construction RFI management system
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/clients">
                <Button variant="secondary" leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}>
                  Clients
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button variant="secondary" leftIcon={<Squares2X2Icon className="w-5 h-5" />}>
                  Projects
                </Button>
              </Link>
              {selectedRFIs.size > 0 && (
                <Button
                  variant="warning"
                  onClick={handleExportSelectedPDFs}
                  disabled={isExportingPDF}
                  leftIcon={<DocumentArrowDownIcon className="w-5 h-5" />}
               >
                  {isExportingPDF 
                    ? 'Exporting...' 
                    : `Export ${selectedRFIs.size} PDF${selectedRFIs.size > 1 ? 's' : ''}`
                  }
                </Button>
              )}
              <Link href="/dashboard/rfis/new">
                <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                  New RFI
                </Button>
              </Link>
            </div>
          </div>

        {/* Stats Cards */}
        {rfisLoading ? (
          <div className="stats-grid">
            <DashboardStatsSkeleton />
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon-primary">
                    <span>📋</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Total RFIs</p>
                    <p className="text-2xl font-bold text-steel-900">{rfis.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon bg-safety-yellow text-steel-900">
                    <span>⏳</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Open</p>
                    <p className="text-2xl font-bold text-steel-900">
                      {rfis.filter(rfi => rfi.status === 'OPEN').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon-info">
                    <span>🔄</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Open</p>
                    <p className="text-2xl font-bold text-steel-900">
                      {rfis.filter(rfi => rfi.status === 'OPEN').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon bg-safety-green text-white">
                    <span>✅</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Closed</p>
                    <p className="text-2xl font-bold text-steel-900">
                      {rfis.filter(rfi => rfi.status === 'CLOSED').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <RFIFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Debug: Email Test */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-4 mb-6">
          <h4 className="text-lg font-semibold text-steel-900 mb-2">Email System Test</h4>
          <p className="text-sm text-steel-600 mb-3">
            Current user: {user?.email || 'Not authenticated'} | Role: {user?.role || 'None'}
          </p>
          <EmailTestButton />
        </div>

        {/* Admin Quick Access */}
        {user?.role === 'ADMIN' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-orange-900">Administrator Access</h4>
                <p className="text-sm text-orange-700">
                  Manage system settings and RFI reminders
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/admin/reminders">
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                    Manage Reminders
                  </button>
                </Link>
                <Link href="/dashboard/admin/system">
                  <button className="px-4 py-2 bg-white text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium">
                    System Admin
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* RFI List */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-steel-900">Recent RFIs</h3>
              {rfis.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRFIs.size === rfis.length && rfis.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-steel-700">Select All</span>
                </label>
              )}
            </div>
          </div>
          
          {rfisLoading ? (
            <div className="card-body">
              <RFIListSkeleton count={5} />
            </div>
          ) : error ? (
            <div className="card-body">
              <div className="alert-error">
                <p>Error loading RFIs: {error.message}</p>
              </div>
            </div>
          ) : rfis.length === 0 ? (
            <div className="card-body text-center py-12">
              <p className="text-steel-500 mb-4">No RFIs found</p>
              <Link href="/dashboard/rfis/new">
                <Button variant="primary" leftIcon={<PlusIcon className="w-5 h-5" />}>
                  Create your first RFI
                </Button>
              </Link>
            </div>
          ) : (
            <div className="card-body">
              <div className="space-y-4">
                {rfis.map((rfi) => (
                  <div key={rfi.id} className={`list-item ${selectedRFIs.has(rfi.id) ? 'list-item-selected' : ''}`}>
                    <div className="list-item-header">
                      <div className="list-item-content">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRFIs.has(rfi.id)}
                            onChange={(e) => handleSelectRFI(rfi.id, e.target.checked)}
                            className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="list-item-title">
                                <Tooltip content={`RFI Number: ${rfi.rfiNumber}`}>
                                  <span className="text-orange-600 font-mono">{rfi.rfiNumber}</span>
                                </Tooltip>
                                <span className="ml-2">{rfi.title}</span>
                              </h4>
                              <StatusBadge status={rfi.status} />
                              <PriorityBadge priority={rfi.priority} />
                            </div>
                            <p className="list-item-description">
                              {rfi.description}
                            </p>
                            <div className="list-item-meta">
                              <TimeAgoTooltip date={rfi.createdAt}>
                                <span>Created {formatDistanceToNow(new Date(rfi.createdAt))} ago</span>
                              </TimeAgoTooltip>
                              {rfi.createdBy && (
                                <Tooltip content={`Created by ${rfi.createdBy.name}`}>
                                  <span>by {rfi.createdBy.name}</span>
                                </Tooltip>
                              )}
                              {rfi.client && (
                                <Tooltip content={`Client: ${rfi.client.name}`}>
                                  <span>• {rfi.client.name}</span>
                                </Tooltip>
                              )}
                              {rfi.project && (
                                <Tooltip content={`Project: ${rfi.project.name}`}>
                                  <span>• {rfi.project.name}</span>
                                </Tooltip>
                              )}
                              {rfi._count?.responses && (
                                <span>• {rfi._count.responses} responses</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="list-item-actions">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleQuickView(rfi)}
                          >
                            Quick View
                          </Button>
                          <Link href={`/dashboard/rfis/${rfi.id}`}>
                            <Button variant="primary" size="sm" rightIcon={<ArrowRightIcon className="w-4 h-4" />}>
                              Details
                            </Button>
                          </Link>
                          <RFIActionMenu 
                            rfi={rfi}
                            onView={() => handleQuickView(rfi)}
                            onEdit={() => router.push(`/dashboard/rfis/${rfi.id}/edit`)}
                            onExport={() => console.log('Export RFI', rfi.id)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Quick View Modal */}
        <RFIQuickView 
          rfi={quickViewRFI}
          isOpen={isQuickViewOpen}
          onClose={handleCloseQuickView}
        />
      </div>
    </DashboardLayout>
  )
}