'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import { ClientLink, ProjectLink, RFILink } from '@/components/ui/EntityLinks'
import { 
  BellIcon, 
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ReminderLogsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/reminders/logs?page=${page}&status=${status}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const handleRefresh = () => {
    mutate()
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load reminder logs</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Reminder Processing Logs
                </h1>
                <p className="text-steel-600">
                  View history of automated reminder emails sent for RFIs
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  leftIcon={<ArrowPathIcon className="w-5 h-5" />}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="stats-grid mb-6">
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon-primary">
                    <BellIcon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Total Reminders</p>
                    <p className="text-2xl font-bold text-steel-900">{data.stats.totalReminders}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon bg-safety-red text-white">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Currently Overdue</p>
                    <p className="text-2xl font-bold text-steel-900">{data.stats.totalOverdue}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon-secondary">
                    <ClockIcon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Sent Today</p>
                    <p className="text-2xl font-bold text-steel-900">{data.stats.remindersToday}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="stat-icon bg-safety-green text-white">
                    <EnvelopeIcon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-steel-600">Last 24 Hours</p>
                    <p className="text-2xl font-bold text-steel-900">{data.stats.recentReminders}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-steel-700">Filter:</span>
              <div className="flex gap-2">
                <Button
                  variant={status === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { setStatus('all'); setPage(1) }}
                >
                  All Reminders
                </Button>
                <Button
                  variant={status === 'overdue' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { setStatus('overdue'); setPage(1) }}
                >
                  Overdue Only
                </Button>
                <Button
                  variant={status === 'reminded' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { setStatus('reminded'); setPage(1) }}
                >
                  Sent Reminders
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card">
          <div className="card-body">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : data?.logs?.length === 0 ? (
              <div className="text-center py-12">
                <BellIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                <p className="text-steel-600">No reminder logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-steel-200">
                      <th className="text-left py-3 px-4 font-medium text-steel-700">RFI</th>
                      <th className="text-left py-3 px-4 font-medium text-steel-700">Project / Client</th>
                      <th className="text-left py-3 px-4 font-medium text-steel-700">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium text-steel-700">Reminders</th>
                      <th className="text-left py-3 px-4 font-medium text-steel-700">Last Sent</th>
                      <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.logs?.map((log: any) => (
                      <tr key={log.id} className="border-b border-steel-100 hover:bg-steel-50">
                        <td className="py-3 px-4">
                          <RFILink rfiId={log.id} rfiNumber={log.rfiNumber}>
                            {log.rfiNumber}
                          </RFILink>
                          <p className="text-sm text-steel-600 mt-1">{log.title}</p>
                        </td>
                        <td className="py-3 px-4">
                          <ProjectLink projectId={log.project.id}>
                            {log.project.name}
                          </ProjectLink>
                          <p className="text-sm text-steel-600 mt-1">
                            <ClientLink clientId={log.client.id}>
                              {log.client.name}
                            </ClientLink>
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={log.dueDate && new Date(log.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                            {log.dueDate ? formatDateTime(new Date(log.dueDate)) : 'No due date'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {log.reminderSent && (
                              <Badge variant="secondary">
                                Reminder sent
                              </Badge>
                            )}
                            {log.emailLogs?.length > 0 && (
                              <Badge variant={log.emailLogs[0].success ? 'success' : 'error'}>
                                {log.emailLogs[0].success ? 'Delivered' : 'Failed'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {log.reminderSent ? (
                            <span className="text-sm">
                              {formatDateTime(new Date(log.reminderSent))}
                            </span>
                          ) : (
                            <span className="text-sm text-steel-400">Never</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={log.status === 'OPEN' ? 'warning' : 'success'}>
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-steel-200">
                <p className="text-sm text-steel-600">
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}