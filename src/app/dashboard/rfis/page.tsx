'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRFIs, useUpdateRFI, useDeleteRFI } from '@/hooks/useRFIs'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '@/types'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Tooltip, TimeAgoTooltip } from '@/components/ui/Tooltip'
import { RFIQuickView, Modal } from '@/components/ui/Modal'
import { RFIActionMenu } from '@/components/ui/Dropdown'
import { CompactTable, Column, TableCell, TableSecondaryText } from '@/components/ui/CompactTable'
import { BulkActionsToolbar, commonBulkActions } from '@/components/ui/BulkActionsToolbar'
import { QuickFilterBadge, StatusBadge as ClickableStatusBadge, PriorityBadge as ClickablePriorityBadge } from '@/components/ui/ClickableBadge'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  BuildingOfficeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, format, isAfter } from 'date-fns'
import { apiClient, downloadFile } from '@/lib/api'
import Link from 'next/link'

export default function RFIsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dueDateFilter, setDueDateFilter] = useState('')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [selectedRFIs, setSelectedRFIs] = useState<string[]>([])
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [quickViewRFI, setQuickViewRFI] = useState<any>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  // Modal states for RFI operations
  const [selectedRFI, setSelectedRFI] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Calculate date filters
  const getDateFilters = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dueDateFilter) {
      case 'overdue':
        return { dateTo: today.toISOString(), overdue: true }
      case 'today':
        return { 
          dateFrom: today.toISOString(),
          dateTo: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      case 'this-week':
        const weekEnd = new Date(today)
        weekEnd.setDate(today.getDate() + 7)
        return { 
          dateFrom: today.toISOString(),
          dateTo: weekEnd.toISOString()
        }
      case 'this-month':
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return { 
          dateFrom: today.toISOString(),
          dateTo: monthEnd.toISOString()
        }
      case 'custom':
        return { 
          dateFrom: customDateFrom || undefined,
          dateTo: customDateTo || undefined
        }
      default:
        return {}
    }
  }

  const { rfis, isLoading: rfisLoading, error } = useRFIs({
    page: 1,
    limit: 100,
    filters: {
      search: searchTerm,
      clientId: selectedClient,
      projectId: selectedProject,
      status: selectedStatus ? [selectedStatus as any] : undefined,
      ...getDateFilters(),
    },
  })

  const { clients } = useClients({ active: true })
  const { projects } = useProjects({ active: true })
  
  // RFI operations
  const { updateRFI } = useUpdateRFI()
  const { deleteRFI } = useDeleteRFI()
  
  // Loading states
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  const handleExportSelectedPDFs = async () => {
    if (selectedRFIs.length === 0) {
      alert('Please select at least one RFI to export.')
      return
    }

    setIsExportingPDF(true)
    try {
      const blob = await apiClient.exportRFIsPDF(selectedRFIs)
      const filename = selectedRFIs.length === 1 
        ? `RFI-Export.pdf`
        : `RFI-Export-${new Date().toISOString().split('T')[0]}.zip`
      downloadFile(blob, filename)
      setSelectedRFIs([])
    } catch (error) {
      console.error('Failed to export PDFs:', error)
      alert('Failed to export PDFs. Please try again.')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedRFIs(selectedIds)
  }

  const handleQuickFilter = (filterKey: string, filterValue?: string | number) => {
    switch (filterKey) {
      case 'status':
        setSelectedStatus(filterValue as string)
        break
      case 'overdue':
        setDueDateFilter('overdue')
        break
      case 'draft':
        setSelectedStatus('DRAFT')
        break
      case 'open':
        setSelectedStatus('OPEN')
        break
      case 'closed':
        setSelectedStatus('CLOSED')
        break
      default:
        break
    }
  }

  const handleQuickView = (rfi: any) => {
    setQuickViewRFI(rfi)
    setIsQuickViewOpen(true)
  }

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false)
    setQuickViewRFI(null)
  }

  const handleStatusChange = async (rfi: any, newStatus: string) => {
    setIsUpdating(true)
    try {
      await updateRFI(rfi.id, { status: newStatus as any })
    } catch (error) {
      console.error('Failed to update RFI status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteRFI = async () => {
    if (!selectedRFI) return
    setIsDeleting(true)
    try {
      await deleteRFI(selectedRFI.id)
      setShowDeleteModal(false)
      setSelectedRFI(null)
    } catch (error) {
      console.error('Failed to delete RFI:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkAction = async (actionId: string) => {
    switch (actionId) {
      case 'delete':
        setIsDeleting(true)
        try {
          await Promise.all(selectedRFIs.map(id => deleteRFI(id)))
          setSelectedRFIs([])
        } catch (error) {
          console.error('Failed to delete RFIs:', error)
        } finally {
          setIsDeleting(false)
        }
        break
      case 'export':
        await handleExportSelectedPDFs()
        break
      default:
        break
    }
  }

  const canDeleteRFI = (rfi: any) => user && (
    user.role === 'ADMIN' || 
    user.id === rfi.createdById
  )

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
    return null
  }

  // Calculate stats
  const rfiStats = {
    total: rfis.length,
    draft: rfis.filter(rfi => rfi.status === 'DRAFT').length,
    open: rfis.filter(rfi => rfi.status === 'OPEN').length,
    closed: rfis.filter(rfi => rfi.status === 'CLOSED').length,
    overdue: rfis.filter(rfi => rfi.dueDate && isAfter(new Date(), new Date(rfi.dueDate)) && rfi.status !== 'CLOSED').length,
  }

  const availableProjects = projects.filter(project => 
    !selectedClient || project.clientId === selectedClient
  )

  // Define table columns
  const rfiColumns: Column[] = [
    {
      key: 'rfiNumber',
      label: 'RFI #',
      sortable: true,
      width: '100px',
      render: (rfi) => (
        <TableCell className="font-mono font-semibold text-orange-700">
          {rfi.rfiNumber}
        </TableCell>
      )
    },
    {
      key: 'title',
      label: 'Title & Description',
      sortable: true,
      className: 'flex-1',
      render: (rfi) => (
        <div>
          <TableCell className="font-medium">{rfi.title}</TableCell>
          {rfi.description && (
            <TableSecondaryText className="line-clamp-2">
              {rfi.description}
            </TableSecondaryText>
          )}
        </div>
      )
    },
    {
      key: 'client',
      label: 'Client & Project',
      width: '180px',
      render: (rfi) => (
        <div>
          <TableCell>{rfi.client?.name || 'No Client'}</TableCell>
          <TableSecondaryText>
            {rfi.project?.name || 'No Project'}
          </TableSecondaryText>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '100px',
      render: (rfi) => (
        <ClickableStatusBadge
          status={rfi.status}
          onFilter={(status) => setSelectedStatus(status)}
          active={selectedStatus === rfi.status}
        />
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      width: '100px',
      render: (rfi) => (
        <ClickablePriorityBadge
          priority={rfi.priority}
          onFilter={(priority) => console.log('Filter by priority:', priority)}
        />
      )
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      width: '120px',
      render: (rfi) => {
        if (!rfi.dueDate) return <TableSecondaryText>Not set</TableSecondaryText>
        const isOverdue = isAfter(new Date(), new Date(rfi.dueDate)) && rfi.status !== 'CLOSED'
        return (
          <div>
            <TableCell className={isOverdue ? 'text-red-600 font-semibold' : ''}>
              {format(new Date(rfi.dueDate), 'MMM d, yyyy')}
            </TableCell>
            {isOverdue && (
              <TableSecondaryText className="text-red-500 font-medium">
                Overdue
              </TableSecondaryText>
            )}
          </div>
        )
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      width: '100px',
      render: (rfi) => (
        <TableSecondaryText>
          {formatDistanceToNow(new Date(rfi.createdAt), { addSuffix: true })}
        </TableSecondaryText>
      )
    }
  ]

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Welcome back, {user?.name}
                </h1>
                <p className="text-steel-600">
                  Track and manage requests for information across all projects
                </p>
              </div>
              <div className="flex gap-3">
                {(searchTerm || dueDateFilter || selectedStatus || selectedClient || selectedProject) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setDueDateFilter('')
                      setSelectedStatus('')
                      setSelectedClient('')
                      setSelectedProject('')
                      setCustomDateFrom('')
                      setCustomDateTo('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                {selectedRFIs.length > 0 && (
                  <Button
                    variant="warning"
                    onClick={handleExportSelectedPDFs}
                    disabled={isExportingPDF}
                    leftIcon={<DocumentArrowDownIcon className="w-5 h-5" />}
                  >
                    {isExportingPDF 
                      ? 'Exporting...' 
                      : `Export ${selectedRFIs.length} PDF${selectedRFIs.length > 1 ? 's' : ''}`
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
          </div>
        </div>

        {/* Stats Cards with Clickable Badges */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total RFIs</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiStats.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('open')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-yellow text-steel-900">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Open"
                    count={rfiStats.open}
                    filterKey="status"
                    filterValue="OPEN"
                    onFilter={handleQuickFilter}
                    active={selectedStatus === 'OPEN'}
                    variant="warning"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('draft')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Draft"
                    count={rfiStats.draft}
                    filterKey="status"
                    filterValue="DRAFT"
                    onFilter={handleQuickFilter}
                    active={selectedStatus === 'DRAFT'}
                    variant="secondary"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('closed')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Closed"
                    count={rfiStats.closed}
                    filterKey="status"
                    filterValue="CLOSED"
                    onFilter={handleQuickFilter}
                    active={selectedStatus === 'CLOSED'}
                    variant="success"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {rfiStats.overdue > 0 && (
            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('overdue')}>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon bg-red-500 text-white">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <QuickFilterBadge
                      label="Overdue"
                      count={rfiStats.overdue}
                      filterKey="overdue"
                      filterValue="overdue"
                      onFilter={handleQuickFilter}
                      active={dueDateFilter === 'overdue'}
                      variant="error"
                      className="text-2xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Filters */}
            <div className="filter-bar">
              <div className="filter-grid">
            <div className="relative">
              <Input
                placeholder="Search RFIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              />
            </div>

            <Select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value)
                setSelectedProject('')
              }}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={!selectedClient}
            >
              <option value="">
                {!selectedClient ? 'Select a client first' : 'All Projects'}
              </option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} - {project.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              value={dueDateFilter}
              onChange={(e) => {
                setDueDateFilter(e.target.value)
                if (e.target.value !== 'custom') {
                  setCustomDateFrom('')
                  setCustomDateTo('')
                }
              }}
            >
              <option value="">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="this-week">Due This Week</option>
              <option value="this-month">Due This Month</option>
              <option value="custom">Custom Range</option>
            </Select>
              </div>

              {/* Custom date range inputs */}
              {dueDateFilter === 'custom' && (
                <div className="filter-grid mt-3">
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    placeholder="From date"
                  />
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    placeholder="To date"
                  />
                </div>
              )}
            </div>

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedRFIs.length}
              totalCount={rfis.length}
              onClearSelection={() => setSelectedRFIs([])}
              actions={[commonBulkActions.delete, commonBulkActions.export]}
              onAction={handleBulkAction}
              isLoading={isDeleting || isExportingPDF}
              className="mb-6"
            />

            {/* Compact RFI Table */}
            <CompactTable
              data={rfis}
              columns={rfiColumns}
              selectedItems={selectedRFIs}
              onSelectionChange={handleSelectionChange}
              getItemId={(rfi) => rfi.id}
              onItemClick={(rfi) => router.push(`/dashboard/rfis/${rfi.id}`)}
              isLoading={rfisLoading}
              emptyMessage={searchTerm ? 'No RFIs match your search criteria' : 'No RFIs found. Create your first RFI to get started.'}
              showSelectAll={true}
              enableHover={true}
              rowClassName={(rfi) => {
                const isOverdue = rfi.dueDate && isAfter(new Date(), new Date(rfi.dueDate)) && rfi.status !== 'CLOSED'
                return isOverdue ? 'bg-red-25 border-l-2 border-l-red-400' : ''
              }}
            />

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/rfis/new">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<PlusIcon className="w-4 h-4" />}>
                      New RFI
                    </Button>
                  </Link>
                  <Link href="/dashboard/clients">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}>
                      Manage Clients
                    </Button>
                  </Link>
                  <Link href="/dashboard/projects">
                    <Button variant="outline" className="w-full justify-start" leftIcon={<FolderIcon className="w-4 h-4" />}>
                      View Projects
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent Projects</h3>
                <div className="space-y-3">
                  {projects.slice(0, 3).map(project => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <p className="font-medium text-steel-900">{project.name}</p>
                        <p className="text-sm text-steel-600">{project.client?.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Clients */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Recent Clients</h3>
                <div className="space-y-3">
                  {clients.slice(0, 3).map(client => (
                    <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                      <div className="p-3 border border-steel-200 rounded-lg hover:border-orange-300 transition-colors">
                        <p className="font-medium text-steel-900">{client.name}</p>
                        <p className="text-sm text-steel-600">{client.contactName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Quick View Modal */}
      <RFIQuickView 
        rfi={quickViewRFI}
        isOpen={isQuickViewOpen}
        onClose={handleCloseQuickView}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete RFI"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">
                  This action cannot be undone
                </h4>
                <p className="text-sm text-red-700">
                  Deleting this RFI will permanently remove all associated responses, attachments, and files from the system.
                </p>
              </div>
            </div>
          </div>
          <p className="text-steel-700">
            Are you sure you want to delete RFI <strong>{selectedRFI?.rfiNumber}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteRFI}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete RFI'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}