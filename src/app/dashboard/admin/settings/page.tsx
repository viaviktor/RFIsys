'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useSettings, useSettingsActions, getSettingValue, isSettingEnabled } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { 
  CogIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { settings, isLoading: settingsLoading, refresh } = useSettings()
  const { 
    updateEmailSettings, 
    updateSystemSettings, 
    updateRFISettings, 
    isLoading: actionLoading 
  } = useSettingsActions()
  
  const [activeTab, setActiveTab] = useState('system')
  const [hasChanges, setHasChanges] = useState(false)

  // Form states
  const [systemForm, setSystemForm] = useState({
    siteName: '',
    adminEmail: '',
    timezone: '',
    dateFormat: '',
    maintenanceMode: false,
  })

  const [emailForm, setEmailForm] = useState({
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
    enabled: true,
  })

  const [rfiForm, setRFIForm] = useState({
    defaultPriority: 'MEDIUM',
    autoAssignNumbers: true,
    numberPrefix: 'RFI',
    reminderDays: 1,
    escalationDays: 3,
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!isLoading && isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])

  // Load settings into form state
  useEffect(() => {
    if (settings) {
      setSystemForm({
        siteName: getSettingValue(settings, 'system', 'siteName', 'STEEL RFI System'),
        adminEmail: getSettingValue(settings, 'system', 'adminEmail', ''),
        timezone: getSettingValue(settings, 'system', 'timezone', 'America/New_York'),
        dateFormat: getSettingValue(settings, 'system', 'dateFormat', 'MM/dd/yyyy'),
        maintenanceMode: isSettingEnabled(settings, 'system', 'maintenanceMode', false),
      })

      setEmailForm({
        host: getSettingValue(settings, 'email', 'host', 'localhost'),
        port: parseInt(getSettingValue(settings, 'email', 'port', '587')),
        user: getSettingValue(settings, 'email', 'user', ''),
        pass: getSettingValue(settings, 'email', 'pass', ''),
        from: getSettingValue(settings, 'email', 'from', 'noreply@example.com'),
        enabled: isSettingEnabled(settings, 'email', 'enabled', true),
      })

      setRFIForm({
        defaultPriority: getSettingValue(settings, 'rfi', 'defaultPriority', 'MEDIUM'),
        autoAssignNumbers: isSettingEnabled(settings, 'rfi', 'autoAssignNumbers', true),
        numberPrefix: getSettingValue(settings, 'rfi', 'numberPrefix', 'RFI'),
        reminderDays: parseInt(getSettingValue(settings, 'rfi', 'reminderDays', '1')),
        escalationDays: parseInt(getSettingValue(settings, 'rfi', 'escalationDays', '3')),
      })
    }
  }, [settings])

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

  const handleSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateSystemSettings(systemForm)
      setHasChanges(false)
      refresh()
      alert('System settings updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update system settings')
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateEmailSettings(emailForm)
      setHasChanges(false)
      refresh()
      alert('Email settings updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update email settings')
    }
  }

  const handleRFISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateRFISettings(rfiForm)
      setHasChanges(false)
      refresh()
      alert('RFI settings updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update RFI settings')
    }
  }

  const tabs = [
    { id: 'system', name: 'System', icon: ComputerDesktopIcon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'rfi', name: 'RFI Settings', icon: DocumentTextIcon },
  ]

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
                <h1 className="text-3xl font-bold text-steel-900">System Settings</h1>
                <p className="text-steel-600 font-medium">
                  Configure system-wide settings and preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          {/* Tabs */}
          <div className="border-b border-steel-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {/* System Settings Tab */}
                {activeTab === 'system' && (
                  <form onSubmit={handleSystemSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">General System Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                          label="Site Name"
                          value={systemForm.siteName}
                          onChange={(e) => {
                            setSystemForm({ ...systemForm, siteName: e.target.value })
                            setHasChanges(true)
                          }}
                          placeholder="Enter site name"
                        />
                        <Input
                          label="Admin Email"
                          type="email"
                          value={systemForm.adminEmail}
                          onChange={(e) => {
                            setSystemForm({ ...systemForm, adminEmail: e.target.value })
                            setHasChanges(true)
                          }}
                          placeholder="admin@example.com"
                        />
                        <Select
                          label="Timezone"
                          value={systemForm.timezone}
                          onChange={(e) => {
                            setSystemForm({ ...systemForm, timezone: e.target.value })
                            setHasChanges(true)
                          }}
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="UTC">UTC</option>
                        </Select>
                        <Select
                          label="Date Format"
                          value={systemForm.dateFormat}
                          onChange={(e) => {
                            setSystemForm({ ...systemForm, dateFormat: e.target.value })
                            setHasChanges(true)
                          }}
                        >
                          <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                          <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                          <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">System Status</h3>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={systemForm.maintenanceMode}
                            onChange={(e) => {
                              setSystemForm({ ...systemForm, maintenanceMode: e.target.checked })
                              setHasChanges(true)
                            }}
                            className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-steel-700">Maintenance Mode</span>
                        </label>
                        {systemForm.maintenanceMode && (
                          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                            <p className="text-sm text-yellow-800">
                              When enabled, only administrators can access the system.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={actionLoading || !hasChanges}
                      >
                        {actionLoading ? 'Saving...' : 'Save System Settings'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Email Settings Tab */}
                {activeTab === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">Email Configuration</h3>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={emailForm.enabled}
                            onChange={(e) => {
                              setEmailForm({ ...emailForm, enabled: e.target.checked })
                              setHasChanges(true)
                            }}
                            className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-steel-700">Enable Email Notifications</span>
                        </label>
                      </div>
                    </div>

                    {emailForm.enabled && (
                      <div>
                        <h3 className="text-lg font-medium text-steel-900 mb-4">SMTP Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input
                            label="SMTP Host"
                            value={emailForm.host}
                            onChange={(e) => {
                              setEmailForm({ ...emailForm, host: e.target.value })
                              setHasChanges(true)
                            }}
                            placeholder="smtp.example.com"
                          />
                          <Input
                            label="SMTP Port"
                            type="number"
                            value={emailForm.port}
                            onChange={(e) => {
                              setEmailForm({ ...emailForm, port: parseInt(e.target.value) || 587 })
                              setHasChanges(true)
                            }}
                            placeholder="587"
                          />
                          <Input
                            label="SMTP Username"
                            value={emailForm.user}
                            onChange={(e) => {
                              setEmailForm({ ...emailForm, user: e.target.value })
                              setHasChanges(true)
                            }}
                            placeholder="username"
                          />
                          <Input
                            label="SMTP Password"
                            type="password"
                            value={emailForm.pass}
                            onChange={(e) => {
                              setEmailForm({ ...emailForm, pass: e.target.value })
                              setHasChanges(true)
                            }}
                            placeholder="password"
                          />
                          <div className="md:col-span-2">
                            <Input
                              label="From Email Address"
                              type="email"
                              value={emailForm.from}
                              onChange={(e) => {
                                setEmailForm({ ...emailForm, from: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="noreply@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={actionLoading || !hasChanges}
                      >
                        {actionLoading ? 'Saving...' : 'Save Email Settings'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* RFI Settings Tab */}
                {activeTab === 'rfi' && (
                  <form onSubmit={handleRFISubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">RFI Defaults</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                          label="Default Priority"
                          value={rfiForm.defaultPriority}
                          onChange={(e) => {
                            setRFIForm({ ...rfiForm, defaultPriority: e.target.value })
                            setHasChanges(true)
                          }}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </Select>
                        <Input
                          label="RFI Number Prefix"
                          value={rfiForm.numberPrefix}
                          onChange={(e) => {
                            setRFIForm({ ...rfiForm, numberPrefix: e.target.value })
                            setHasChanges(true)
                          }}
                          placeholder="RFI"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">Automation Settings</h3>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={rfiForm.autoAssignNumbers}
                            onChange={(e) => {
                              setRFIForm({ ...rfiForm, autoAssignNumbers: e.target.checked })
                              setHasChanges(true)
                            }}
                            className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-steel-700">Auto-assign RFI Numbers</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-steel-900 mb-4">Reminder Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                          label="Reminder Days Before Due"
                          type="number"
                          min="0"
                          value={rfiForm.reminderDays}
                          onChange={(e) => {
                            setRFIForm({ ...rfiForm, reminderDays: parseInt(e.target.value) || 1 })
                            setHasChanges(true)
                          }}
                          placeholder="1"
                        />
                        <Input
                          label="Escalation Days After Due"
                          type="number"
                          min="0"
                          value={rfiForm.escalationDays}
                          onChange={(e) => {
                            setRFIForm({ ...rfiForm, escalationDays: parseInt(e.target.value) || 3 })
                            setHasChanges(true)
                          }}
                          placeholder="3"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={actionLoading || !hasChanges}
                      >
                        {actionLoading ? 'Saving...' : 'Save RFI Settings'}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}