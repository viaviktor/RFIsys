'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/components/providers/AuthProvider'
import { User } from '@/types'

interface AdminAccountData {
  users: User[]
  stakeholders: User[]
  stats: {
    totalUsers: number
    activeUsers: number
    totalStakeholders: number
    activeStakeholders: number
    recentRegistrations: number
  }
}

interface AccountManagementData {
  id: string
  name: string
  email: string
  role: string
  userType: 'internal' | 'stakeholder'
  active?: boolean
  createdAt: string
  lastLogin?: string
  clientName?: string
  projectCount?: number
  _count?: {
    rfisCreated?: number
    responses?: number
    projects?: number
  }
}

export default function AdminAccountsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountManagementData[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalStakeholders: 0,
    activeStakeholders: 0,
    recentRegistrations: 0
  })
  const [selectedAccount, setSelectedAccount] = useState<AccountManagementData | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'internal' | 'stakeholder'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Redirect if not admin
  useEffect(() => {
    if (user && (user.userType !== 'internal' || user.role !== 'ADMIN')) {
      window.location.href = '/dashboard'
    }
  }, [user])

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/users?includeStakeholders=true')
      const result = await response.json()
      
      if (response.ok) {
        const allAccounts = result.data || []
        setAccounts(allAccounts)
        
        // Calculate stats
        const internalUsers = allAccounts.filter((acc: AccountManagementData) => acc.userType === 'internal')
        const stakeholders = allAccounts.filter((acc: AccountManagementData) => acc.userType === 'stakeholder')
        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 30)
        
        setStats({
          totalUsers: internalUsers.length,
          activeUsers: internalUsers.filter((acc: AccountManagementData) => acc.active !== false).length,
          totalStakeholders: stakeholders.length,
          activeStakeholders: stakeholders.filter((acc: AccountManagementData) => acc.active !== false).length,
          recentRegistrations: allAccounts.filter((acc: AccountManagementData) => 
            new Date(acc.createdAt) > recentDate
          ).length
        })
      } else {
        toast.error(result.error || 'Failed to load account data')
      }
    } catch (error) {
      toast.error('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (accountId: string, userType: 'internal' | 'stakeholder') => {
    if (!confirm('Are you sure you want to reset this user\'s password? They will need to contact an administrator for a new password.')) {
      return
    }

    try {
      const endpoint = userType === 'internal' ? `/api/admin/users/${accountId}/reset-password` : `/api/admin/stakeholders/${accountId}/reset-password`
      const response = await fetch(endpoint, { method: 'POST' })
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Password reset successfully. User will need to contact admin for new password.')
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  const handleToggleAccount = async (accountId: string, userType: 'internal' | 'stakeholder', currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} this account?`)) {
      return
    }

    try {
      const endpoint = userType === 'internal' 
        ? `/api/admin/users/${accountId}/${action}` 
        : `/api/admin/stakeholders/${accountId}/${action}`
      const response = await fetch(endpoint, { method: 'POST' })
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Account ${action}d successfully`)
        fetchAccountData() // Refresh data
      } else {
        toast.error(result.error || `Failed to ${action} account`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} account`)
    }
  }

  const handleExportAccountData = async (accountId: string, userType: 'internal' | 'stakeholder') => {
    try {
      const endpoint = userType === 'internal' 
        ? `/api/admin/users/${accountId}/export` 
        : `/api/admin/stakeholders/${accountId}/export`
      const response = await fetch(endpoint, { method: 'POST' })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 
                        `account-data-${accountId}-${new Date().toISOString().split('T')[0]}.json`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast.success('Account data exported successfully')
      } else {
        const result = await response.json()
        toast.error(result.error || 'Failed to export account data')
      }
    } catch (error) {
      toast.error('Failed to export account data')
    }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesFilter = filter === 'all' || account.userType === filter
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (account.clientName && account.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="animate-pulse">
            <div className="h-8 bg-steel-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="h-16 bg-steel-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-steel-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-steel-900">Account Management</h1>
          <p className="text-steel-600 mt-2">Manage all user accounts and stakeholder access</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid mb-8">
          <div className="stat-card">
            <div className="card-body">
              <div className="stat-icon-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-steel-600">Total Users</p>
                <p className="text-2xl font-bold text-steel-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="stat-icon-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-steel-600">Active Users</p>
                <p className="text-2xl font-bold text-steel-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="stat-icon-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-steel-600">Stakeholders</p>
                <p className="text-2xl font-bold text-steel-900">{stats.totalStakeholders}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="stat-icon-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-steel-600">Recent (30d)</p>
                <p className="text-2xl font-bold text-steel-900">{stats.recentRegistrations}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-steel-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    filter === 'all'
                      ? 'bg-steel-600 text-white'
                      : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                  }`}
                >
                  All ({accounts.length})
                </button>
                <button
                  onClick={() => setFilter('internal')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    filter === 'internal'
                      ? 'bg-steel-600 text-white'
                      : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                  }`}
                >
                  Internal ({accounts.filter(a => a.userType === 'internal').length})
                </button>
                <button
                  onClick={() => setFilter('stakeholder')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    filter === 'stakeholder'
                      ? 'bg-steel-600 text-white'
                      : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                  }`}
                >
                  Stakeholders ({accounts.filter(a => a.userType === 'stakeholder').length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-steel-900">Account List</h2>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-steel-50 border-b border-steel-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-steel-700">User</th>
                    <th className="text-left py-3 px-4 font-medium text-steel-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-steel-700">Activity</th>
                    <th className="text-left py-3 px-4 font-medium text-steel-700">Last Login</th>
                    <th className="text-right py-3 px-4 font-medium text-steel-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-200">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-steel-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-steel-900">{account.name}</div>
                          <div className="text-sm text-steel-600">{account.email}</div>
                          {account.clientName && (
                            <div className="text-xs text-steel-500">{account.clientName}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.userType === 'internal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {account.userType === 'internal' ? account.role : `${account.role}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {account.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-steel-600">
                          {account._count && (
                            <>
                              {account._count.rfisCreated && (
                                <div>{account._count.rfisCreated} RFIs</div>
                              )}
                              {account._count.responses && (
                                <div>{account._count.responses} Responses</div>
                              )}
                              {account.projectCount && (
                                <div>{account.projectCount} Projects</div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-steel-600">
                        {account.lastLogin
                          ? new Date(account.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleExportAccountData(account.id, account.userType)}
                            className="text-steel-600 hover:text-steel-900 text-sm"
                            title="Export Data"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleResetPassword(account.id, account.userType)}
                            className="text-orange-600 hover:text-orange-900 text-sm"
                            title="Reset Password"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => handleToggleAccount(account.id, account.userType, account.active !== false)}
                            className={`text-sm ${
                              account.active !== false
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={account.active !== false ? 'Deactivate' : 'Activate'}
                          >
                            {account.active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAccounts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-steel-600">No accounts found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Privacy Compliance</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This account management system complies with GDPR and CCPA regulations. 
                  All data exports include only necessary information, and account deletion permanently anonymizes personal data.
                  Password resets require administrative contact for security purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}