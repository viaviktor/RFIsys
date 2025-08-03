'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ReminderManager } from '@/components/admin/ReminderManager'
import { useReminderSummary } from '@/hooks/useReminders'
import { Button } from '@/components/ui/Button'
import { 
  BellIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

export default function AdminRemindersPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

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

  if (!isAuthenticated || !user) {
    return null
  }

  if (user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-xl font-bold text-steel-900 mb-2">Access Denied</h2>
              <p className="text-steel-600 mb-4">You don't have permission to access this page.</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const { summary, isLoading: summaryLoading } = useReminderSummary()

  // Calculate stats
  const reminderStats = {
    dueTomorrow: summary?.dueTomorrow || 0,
    overdue: summary?.overdue || 0,
    total: (summary?.dueTomorrow || 0) + (summary?.overdue || 0),
    lastUpdated: summary?.timestamp
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  RFI Reminder Management
                </h1>
                <p className="text-steel-600">
                  Monitor and manage automated email reminders for RFI due dates and overdue notifications
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  leftIcon={<BellIcon className="w-5 h-5" />}
                  onClick={() => router.push('/dashboard/admin/reminders/logs')}
                >
                  View Logs
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-yellow text-steel-900">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Due Tomorrow</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {summaryLoading ? '...' : reminderStats.dueTomorrow}
                  </p>
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
                  <p className="text-sm font-medium text-steel-600">Overdue</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {summaryLoading ? '...' : reminderStats.overdue}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <BellIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Alerts</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {summaryLoading ? '...' : reminderStats.total}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-secondary">
                  <EnvelopeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">System Status</p>
                  <p className="text-sm font-bold text-safety-green">
                    {summaryLoading ? 'Loading...' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            <ReminderManager />
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<BellIcon className="w-4 h-4" />}
                    onClick={() => window.open('/api/admin/reminders/test', '_blank')}
                  >
                    Test Reminder System
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                    onClick={() => window.open('/dashboard/admin/settings#email', '_blank')}
                  >
                    Email Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    onClick={() => router.push('/dashboard/admin/reminders/logs')}
                  >
                    View Processing Logs
                  </Button>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">System Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Schedule:</span>
                    <span className="font-medium">Daily 8:00 AM ET</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Due Tomorrow:</span>
                    <span className="font-medium">1 day before</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Overdue:</span>
                    <span className="font-medium">Daily until closed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Recipients:</span>
                    <span className="font-medium">All stakeholders</span>
                  </div>
                  {reminderStats.lastUpdated && (
                    <div className="pt-2 border-t border-steel-200">
                      <div className="flex justify-between">
                        <span className="text-steel-600">Last Updated:</span>
                        <span className="font-medium text-xs">
                          {new Date(reminderStats.lastUpdated).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Status */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Processing Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-safety-green rounded-full"></div>
                    <span className="text-sm text-steel-700">Automated System Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-safety-blue rounded-full"></div>
                    <span className="text-sm text-steel-700">Email Provider Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-safety-yellow rounded-full"></div>
                    <span className="text-sm text-steel-700">Manual Processing Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}