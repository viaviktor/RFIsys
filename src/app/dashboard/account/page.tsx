'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/components/providers/AuthProvider'

interface AccountData {
  id: string
  name: string
  email: string
  role: string
  userType: string
  phone?: string
  title?: string
  active?: boolean
  createdAt: string
  updatedAt: string
  lastLogin?: string
  client?: {
    id: string
    name: string
  }
  projects?: Array<{
    id: string
    name: string
  }>
  _count?: {
    rfisCreated: number
    responses: number
    projects: number
  }
}

export default function AccountPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showDataExport, setShowDataExport] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: ''
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [exportOptions, setExportOptions] = useState({
    includePersonalData: true,
    includeActivityData: true,
    includeSystemLogs: false,
    format: 'json' as 'json' | 'csv'
  })

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/account')
      const result = await response.json()
      
      if (response.ok) {
        setAccountData(result.data)
        setFormData({
          name: result.data.name || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          title: result.data.title || ''
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

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    
    try {
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Account updated successfully')
        setAccountData(prev => prev ? { ...prev, ...result.data } : null)
      } else {
        toast.error(result.error || 'Failed to update account')
      }
    } catch (error) {
      toast.error('Failed to update account')
    } finally {
      setUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    
    setUpdating(true)
    
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Password changed successfully')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordChange(false)
      } else {
        toast.error(result.error || 'Failed to change password')
      }
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setUpdating(false)
    }
  }

  const handleDataExport = async () => {
    try {
      setUpdating(true)
      const response = await fetch('/api/account/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportOptions)
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 
                        `account-data-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast.success('Data exported successfully')
        setShowDataExport(false)
      } else {
        const result = await response.json()
        toast.error(result.error || 'Failed to export data')
      }
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setUpdating(false)
    }
  }

  const handleAccountDeletion = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will anonymize all your personal data.'
    )
    
    if (!confirmed) return
    
    const doubleConfirm = window.confirm(
      'This is your final warning. Deleting your account will permanently remove all personal information. Type "DELETE" in the next prompt to confirm.'
    )
    
    if (!doubleConfirm) return
    
    const finalConfirm = prompt('Type "DELETE" to confirm account deletion:')
    if (finalConfirm !== 'DELETE') {
      toast.error('Account deletion cancelled')
      return
    }
    
    try {
      setUpdating(true)
      const response = await fetch('/api/account?confirm=true', {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Account deleted successfully')
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        toast.error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      toast.error('Failed to delete account')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="animate-pulse">
            <div className="h-8 bg-steel-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-steel-200 rounded"></div>
              <div className="h-4 bg-steel-200 rounded w-3/4"></div>
              <div className="h-4 bg-steel-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!accountData) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-steel-900 mb-4">Account Not Found</h1>
            <p className="text-steel-600">Unable to load your account information.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-steel-900">Account Settings</h1>
          <p className="text-steel-600 mt-2">Manage your account information and privacy settings</p>
        </div>

        <div className="content-grid">
          <div className="main-content space-y-6">
            {/* Account Information */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-steel-900">Account Information</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleUpdateAccount} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-steel-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-steel-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                        required
                      />
                    </div>
                    
                    {accountData.userType === 'stakeholder' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updating}
                      className="btn btn-primary"
                    >
                      {updating ? 'Updating...' : 'Update Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Security Settings */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-steel-900">Security</h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-steel-900">Password</h3>
                      <p className="text-sm text-steel-600">Change your account password</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="btn btn-secondary"
                    >
                      Change Password
                    </button>
                  </div>
                  
                  {showPasswordChange && (
                    <form onSubmit={handlePasswordChange} className="mt-4 p-4 bg-steel-50 rounded-md">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                            minLength={8}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                            required
                          />
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            type="submit"
                            disabled={updating}
                            className="btn btn-primary"
                          >
                            {updating ? 'Changing...' : 'Change Password'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(false)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy & Data */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-steel-900">Privacy & Data</h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-steel-900">Export Your Data</h3>
                      <p className="text-sm text-steel-600">Download a copy of your personal data (GDPR/CCPA compliance)</p>
                    </div>
                    <button
                      onClick={() => setShowDataExport(!showDataExport)}
                      className="btn btn-secondary"
                    >
                      Export Data
                    </button>
                  </div>
                  
                  {showDataExport && (
                    <div className="mt-4 p-4 bg-steel-50 rounded-md">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-steel-700 mb-2">Data to Include</h4>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={exportOptions.includePersonalData}
                                onChange={(e) => setExportOptions({ ...exportOptions, includePersonalData: e.target.checked })}
                                className="rounded border-steel-300 text-steel-600 focus:ring-steel-500"
                              />
                              <span className="ml-2 text-sm text-steel-700">Personal information</span>
                            </label>
                            
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={exportOptions.includeActivityData}
                                onChange={(e) => setExportOptions({ ...exportOptions, includeActivityData: e.target.checked })}
                                className="rounded border-steel-300 text-steel-600 focus:ring-steel-500"
                              />
                              <span className="ml-2 text-sm text-steel-700">Activity data (RFIs, responses, projects)</span>
                            </label>
                            
                            {user?.role === 'ADMIN' && (
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={exportOptions.includeSystemLogs}
                                  onChange={(e) => setExportOptions({ ...exportOptions, includeSystemLogs: e.target.checked })}
                                  className="rounded border-steel-300 text-steel-600 focus:ring-steel-500"
                                />
                                <span className="ml-2 text-sm text-steel-700">System logs (Admin only)</span>
                              </label>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-steel-700 mb-1">
                            Export Format
                          </label>
                          <select
                            value={exportOptions.format}
                            onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as 'json' | 'csv' })}
                            className="w-32 px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-steel-500"
                          >
                            <option value="json">JSON</option>
                            <option value="csv">CSV</option>
                          </select>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDataExport}
                            disabled={updating}
                            className="btn btn-primary"
                          >
                            {updating ? 'Exporting...' : 'Download Data'}
                          </button>
                          <button
                            onClick={() => setShowDataExport(false)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <hr className="border-steel-200" />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-steel-900 text-red-600">Delete Account</h3>
                      <p className="text-sm text-steel-600">Permanently delete your account and anonymize all personal data</p>
                    </div>
                    <button
                      onClick={handleAccountDeletion}
                      disabled={updating}
                      className="btn btn-danger"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar-content space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Account Summary</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Role:</span>
                    <span className="font-medium text-steel-900">{accountData.role}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-steel-600">Account Type:</span>
                    <span className="font-medium text-steel-900 capitalize">{accountData.userType}</span>
                  </div>
                  
                  {accountData.client && (
                    <div className="flex justify-between">
                      <span className="text-steel-600">Client:</span>
                      <span className="font-medium text-steel-900">{accountData.client.name}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-steel-600">Member Since:</span>
                    <span className="font-medium text-steel-900">
                      {new Date(accountData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {accountData.lastLogin && (
                    <div className="flex justify-between">
                      <span className="text-steel-600">Last Login:</span>
                      <span className="font-medium text-steel-900">
                        {new Date(accountData.lastLogin).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {accountData._count && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-steel-900">Activity Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-steel-600">RFIs Created:</span>
                      <span className="font-medium text-steel-900">{accountData._count.rfisCreated}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-steel-600">Responses:</span>
                      <span className="font-medium text-steel-900">{accountData._count.responses}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-steel-600">Projects:</span>
                      <span className="font-medium text-steel-900">{accountData._count.projects}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {accountData.projects && accountData.projects.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-steel-900">Your Projects</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {accountData.projects.slice(0, 5).map((project) => (
                      <div key={project.id} className="text-sm">
                        <a
                          href={`/dashboard/projects/${project.id}`}
                          className="text-steel-600 hover:text-steel-900 hover:underline"
                        >
                          {project.name}
                        </a>
                      </div>
                    ))}
                    {accountData.projects.length > 5 && (
                      <div className="text-sm text-steel-500">
                        +{accountData.projects.length - 5} more projects
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}