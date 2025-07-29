'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CogIcon, ServerIcon, UserGroupIcon, EnvelopeIcon, BellIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'

const EmailTestButton = dynamic(() => import('@/components/email/EmailTestButton').then(mod => ({ default: mod.EmailTestButton })), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function AdminSystemPage() {
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

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-steel-900">System Administration</h1>
                <p className="text-steel-600 font-medium">
                  System configuration and maintenance tools
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* System Status */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ServerIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-steel-900">System Status</h3>
                  <p className="text-sm text-steel-600">All systems operational</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Database</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Email Service</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Cron Jobs</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Running
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-steel-900">Current User</h3>
                  <p className="text-sm text-steel-600">Administrator access</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Name</span>
                  <span className="text-sm font-medium text-steel-900">{user.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Email</span>
                  <span className="text-sm font-medium text-steel-900">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-steel-600">Role</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Testing */}
          <div className="bg-white rounded-lg shadow-steel border border-steel-200">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-steel-900">Email System</h3>
                  <p className="text-sm text-steel-600">Test email functionality</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <p className="text-sm text-steel-600 mb-4">
                Test the email system to ensure notifications are working correctly.
              </p>
              <EmailTestButton />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <h3 className="text-xl font-bold text-steel-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/dashboard/admin/reminders')}
                className="flex items-center gap-3 p-4 border border-steel-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-steel-900">Manage Reminders</h4>
                  <p className="text-sm text-steel-600">Configure RFI reminder settings</p>
                </div>
              </button>

              <button
                onClick={() => window.open('/api/rfis/reminders', '_blank')}
                className="flex items-center gap-3 p-4 border border-steel-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ServerIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-steel-900">API Status</h4>
                  <p className="text-sm text-steel-600">Check reminder API status</p>
                </div>
              </button>

              <div className="flex items-center gap-3 p-4 border border-steel-200 rounded-lg opacity-50">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CogIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-steel-900">Settings</h4>
                  <p className="text-sm text-steel-600">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <h3 className="text-xl font-bold text-steel-900">System Information</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-steel-900 mb-3">RFI Reminder System</h4>
                <div className="space-y-2 text-sm text-steel-600">
                  <p>• Automated reminders run daily at 8:00 AM Eastern Time</p>
                  <p>• RFIs due tomorrow receive advance notice</p>
                  <p>• Overdue RFIs get daily reminder notifications</p>
                  <p>• Emails sent to all project stakeholders</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-steel-900 mb-3">System Features</h4>
                <div className="space-y-2 text-sm text-steel-600">
                  <p>• Real-time email delivery tracking</p>
                  <p>• Automatic stakeholder management</p>
                  <p>• PDF attachment generation</p>
                  <p>• Comprehensive audit logging</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}