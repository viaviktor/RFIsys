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
  ExclamationTriangleIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { settings, isLoading: settingsLoading, refresh } = useSettings()
  const updateSettingsActions = useSettingsActions()
  const { 
    updateEmailSettings, 
    updateSystemSettings, 
    updateRFISettings, 
    isLoading: actionLoading 
  } = updateSettingsActions
  
  const [activeTab, setActiveTab] = useState('system')
  const [hasChanges, setHasChanges] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

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

  const [mailgunForm, setMailgunForm] = useState({
    provider: 'mailgun',
    apiKey: '',
    domain: 'mgrfi.steel-detailer.com',
    webhookSigningKey: '',
    replyDomain: 'mg.steel-detailer.com',
    enabled: false,
  })

  const [brevoForm, setBrevoForm] = useState({
    provider: 'brevo',
    apiKey: '',
    replyDomain: '',
    webhookSecret: '',
    enabled: false,
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

      setMailgunForm({
        provider: 'mailgun',
        apiKey: getSettingValue(settings, 'mailgun', 'apiKey', ''),
        domain: getSettingValue(settings, 'mailgun', 'domain', 'mgrfi.steel-detailer.com'),
        webhookSigningKey: getSettingValue(settings, 'mailgun', 'webhookSigningKey', ''),
        replyDomain: getSettingValue(settings, 'mailgun', 'replyDomain', 'mg.steel-detailer.com'),
        enabled: isSettingEnabled(settings, 'mailgun', 'enabled', false),
      })

      setBrevoForm({
        provider: 'brevo',
        apiKey: getSettingValue(settings, 'brevo', 'apiKey', ''),
        replyDomain: getSettingValue(settings, 'brevo', 'replyDomain', ''),
        webhookSecret: getSettingValue(settings, 'brevo', 'webhookSecret', ''),
        enabled: isSettingEnabled(settings, 'brevo', 'enabled', false),
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

  const handleMailgunSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const settingsArray = [
        { key: 'mailgun.apiKey', value: mailgunForm.apiKey, description: 'Mailgun API Key' },
        { key: 'mailgun.domain', value: mailgunForm.domain, description: 'Mailgun Domain' },
        { key: 'mailgun.webhookSigningKey', value: mailgunForm.webhookSigningKey, description: 'Mailgun Webhook Signing Key' },
        { key: 'mailgun.replyDomain', value: mailgunForm.replyDomain, description: 'Mailgun Reply Domain' },
        { key: 'mailgun.enabled', value: String(mailgunForm.enabled), description: 'Mailgun Enabled' },
        { key: 'system.emailProvider', value: mailgunForm.enabled ? 'mailgun' : '', description: 'Active Email Provider' },
      ]
      
      await updateSettingsActions.bulkUpdateSettings(settingsArray)
      setHasChanges(false)
      refresh()
      alert('Mailgun settings updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update Mailgun settings')
    }
  }

  const handleBrevoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const settingsArray = [
        { key: 'brevo.apiKey', value: brevoForm.apiKey, description: 'Brevo API Key' },
        { key: 'brevo.replyDomain', value: brevoForm.replyDomain, description: 'Brevo Reply Domain' },
        { key: 'brevo.webhookSecret', value: brevoForm.webhookSecret, description: 'Brevo Webhook Secret' },
        { key: 'brevo.enabled', value: String(brevoForm.enabled), description: 'Brevo Enabled' },
        { key: 'system.emailProvider', value: brevoForm.enabled ? 'brevo' : '', description: 'Active Email Provider' },
      ]
      
      await updateSettingsActions.bulkUpdateSettings(settingsArray)
      setHasChanges(false)
      refresh()
      alert('Brevo settings updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update Brevo settings')
    }
  }

  const testEmailProvider = async (provider: 'mailgun' | 'brevo' | 'smtp') => {
    try {
      setTestResults({ ...testResults, [provider]: { testing: true } })
      
      const response = await fetch(`/api/admin/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider, testEmail: user?.email })
      })

      const result = await response.json()
      setTestResults({ 
        ...testResults, 
        [provider]: { 
          testing: false, 
          success: result.success, 
          message: result.message || result.error,
          timestamp: new Date().toLocaleTimeString()
        } 
      })
    } catch (error) {
      setTestResults({ 
        ...testResults, 
        [provider]: { 
          testing: false, 
          success: false, 
          message: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          timestamp: new Date().toLocaleTimeString()
        } 
      })
    }
  }

  const tabs = [
    { id: 'system', name: 'System', icon: ComputerDesktopIcon },
    { id: 'email', name: 'SMTP Email', icon: EnvelopeIcon },
    { id: 'providers', name: 'Email Providers', icon: ServerIcon },
    { id: 'rfi', name: 'RFI Settings', icon: DocumentTextIcon },
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
                  System Settings
                </h1>
                <p className="text-steel-600">
                  Configure system-wide settings, email providers, and RFI defaults
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => testEmailProvider('smtp')}
                  leftIcon={<EnvelopeIcon className="w-5 h-5" />}
                >
                  Test Email
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Status Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <CogIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">System</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {systemForm.maintenanceMode ? 'Maintenance' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className={`stat-icon ${
                  emailForm.enabled || mailgunForm.enabled || brevoForm.enabled 
                    ? 'bg-safety-green text-white' 
                    : 'bg-steel-400 text-white'
                }`}>
                  <EnvelopeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Email</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {emailForm.enabled || mailgunForm.enabled || brevoForm.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className={`stat-icon ${
                  mailgunForm.enabled ? 'bg-safety-green text-white' : 
                  brevoForm.enabled ? 'bg-safety-yellow text-steel-900' : 
                  'bg-steel-400 text-white'
                }`}>
                  <ServerIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Provider</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {mailgunForm.enabled ? 'Mailgun' : 
                     brevoForm.enabled ? 'Brevo' : 
                     emailForm.enabled ? 'SMTP' : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-info">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">RFI Prefix</p>
                  <p className="text-2xl font-bold text-steel-900">{rfiForm.numberPrefix}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">

            {/* Settings Tabs */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-steel-900">Configuration</h2>
              </div>
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

                {/* Email Providers Tab */}
                {activeTab === 'providers' && (
                  <div className="space-y-8">
                    {/* Provider Selection Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-2">Email Provider Configuration</h3>
                      <p className="text-sm text-blue-800">
                        Configure Mailgun or Brevo for professional email delivery and reply-by-email functionality. 
                        Enable only one provider at a time for best results.
                      </p>
                    </div>

                    {/* Mailgun Configuration */}
                    <div className="bg-white border border-steel-200 rounded-lg p-6">
                      <form onSubmit={handleMailgunSubmit} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-steel-900">Mailgun Configuration</h3>
                            <p className="text-sm text-steel-600 mt-1">
                              Production-grade email delivery with advanced features
                            </p>
                          </div>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={mailgunForm.enabled}
                              onChange={(e) => {
                                setMailgunForm({ ...mailgunForm, enabled: e.target.checked })
                                if (e.target.checked) {
                                  setBrevoForm({ ...brevoForm, enabled: false })
                                }
                                setHasChanges(true)
                              }}
                              className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-steel-700">Enable Mailgun</span>
                          </label>
                        </div>

                        {mailgunForm.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                              label="API Key"
                              type="password"
                              value={mailgunForm.apiKey}
                              onChange={(e) => {
                                setMailgunForm({ ...mailgunForm, apiKey: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                            <Input
                              label="Domain"
                              value={mailgunForm.domain}
                              onChange={(e) => {
                                setMailgunForm({ ...mailgunForm, domain: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="mgrfi.steel-detailer.com"
                            />
                            <Input
                              label="Webhook Signing Key"
                              type="password"
                              value={mailgunForm.webhookSigningKey}
                              onChange={(e) => {
                                setMailgunForm({ ...mailgunForm, webhookSigningKey: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="webhook-signing-key"
                            />
                            <Input
                              label="Reply Domain"
                              value={mailgunForm.replyDomain}
                              onChange={(e) => {
                                setMailgunForm({ ...mailgunForm, replyDomain: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="mgrfi.steel-detailer.com"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={actionLoading || !hasChanges}
                            >
                              {actionLoading ? 'Saving...' : 'Save Mailgun Settings'}
                            </Button>
                            {mailgunForm.enabled && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => testEmailProvider('mailgun')}
                                disabled={testResults.mailgun?.testing}
                              >
                                {testResults.mailgun?.testing ? 'Testing...' : 'Test Mailgun'}
                              </Button>
                            )}
                          </div>
                          {testResults.mailgun && !testResults.mailgun.testing && (
                            <div className={`flex items-center gap-2 text-sm ${testResults.mailgun.success ? 'text-green-600' : 'text-red-600'}`}>
                              {testResults.mailgun.success ? (
                                <CheckCircleIcon className="w-4 h-4" />
                              ) : (
                                <XCircleIcon className="w-4 h-4" />
                              )}
                              <span>{testResults.mailgun.message}</span>
                              <span className="text-steel-500">({testResults.mailgun.timestamp})</span>
                            </div>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Brevo Configuration */}
                    <div className="bg-white border border-steel-200 rounded-lg p-6">
                      <form onSubmit={handleBrevoSubmit} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-steel-900">Brevo Configuration</h3>
                            <p className="text-sm text-steel-600 mt-1">
                              Free tier email service (300 emails/day)
                            </p>
                          </div>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={brevoForm.enabled}
                              onChange={(e) => {
                                setBrevoForm({ ...brevoForm, enabled: e.target.checked })
                                if (e.target.checked) {
                                  setMailgunForm({ ...mailgunForm, enabled: false })
                                }
                                setHasChanges(true)
                              }}
                              className="w-4 h-4 text-orange-600 border-steel-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-steel-700">Enable Brevo</span>
                          </label>
                        </div>

                        {brevoForm.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                              label="API Key"
                              type="password"
                              value={brevoForm.apiKey}
                              onChange={(e) => {
                                setBrevoForm({ ...brevoForm, apiKey: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                            <Input
                              label="Reply Domain"
                              value={brevoForm.replyDomain}
                              onChange={(e) => {
                                setBrevoForm({ ...brevoForm, replyDomain: e.target.value })
                                setHasChanges(true)
                              }}
                              placeholder="mgrfi.steel-detailer.com"
                            />
                            <div className="md:col-span-2">
                              <Input
                                label="Webhook Secret"
                                type="password"
                                value={brevoForm.webhookSecret}
                                onChange={(e) => {
                                  setBrevoForm({ ...brevoForm, webhookSecret: e.target.value })
                                  setHasChanges(true)
                                }}
                                placeholder="your-webhook-secret-key"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={actionLoading || !hasChanges}
                            >
                              {actionLoading ? 'Saving...' : 'Save Brevo Settings'}
                            </Button>
                            {brevoForm.enabled && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => testEmailProvider('brevo')}
                                disabled={testResults.brevo?.testing}
                              >
                                {testResults.brevo?.testing ? 'Testing...' : 'Test Brevo'}
                              </Button>
                            )}
                          </div>
                          {testResults.brevo && !testResults.brevo.testing && (
                            <div className={`flex items-center gap-2 text-sm ${testResults.brevo.success ? 'text-green-600' : 'text-red-600'}`}>
                              {testResults.brevo.success ? (
                                <CheckCircleIcon className="w-4 h-4" />
                              ) : (
                                <XCircleIcon className="w-4 h-4" />
                              )}
                              <span>{testResults.brevo.message}</span>
                              <span className="text-steel-500">({testResults.brevo.timestamp})</span>
                            </div>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Webhook Information */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-md font-medium text-yellow-900 mb-2">Webhook Configuration</h4>
                      <p className="text-sm text-yellow-800 mb-2">
                        After configuring your email provider, set up webhooks for reply-by-email functionality:
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li><strong>Mailgun:</strong> {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/email/mailgun-webhook</li>
                        <li><strong>Brevo:</strong> {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/rfis/email-reply</li>
                      </ul>
                    </div>
                  </div>
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
                    onClick={() => testEmailProvider('smtp')}
                    leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                  >
                    Test SMTP Email
                  </Button>
                  {mailgunForm.enabled && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => testEmailProvider('mailgun')}
                      leftIcon={<ServerIcon className="w-4 h-4" />}
                    >
                      Test Mailgun
                    </Button>
                  )}
                  {brevoForm.enabled && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => testEmailProvider('brevo')}
                      leftIcon={<ServerIcon className="w-4 h-4" />}
                    >
                      Test Brevo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSystemForm({ ...systemForm, maintenanceMode: !systemForm.maintenanceMode })
                      setHasChanges(true)
                    }}
                    leftIcon={<ExclamationTriangleIcon className="w-4 h-4" />}
                  >
                    Toggle Maintenance
                  </Button>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-steel-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ComputerDesktopIcon className="w-4 h-4 text-steel-600" />
                      <span className="text-sm font-medium text-steel-700">System</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      systemForm.maintenanceMode 
                        ? 'text-safety-red' 
                        : 'text-safety-green'
                    }`}>
                      {systemForm.maintenanceMode ? (
                        <ExclamationTriangleIcon className="w-4 h-4" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                      {systemForm.maintenanceMode ? 'Maintenance' : 'Active'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-steel-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-steel-600" />
                      <span className="text-sm font-medium text-steel-700">Email</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      emailForm.enabled || mailgunForm.enabled || brevoForm.enabled 
                        ? 'text-safety-green' 
                        : 'text-steel-500'
                    }`}>
                      {emailForm.enabled || mailgunForm.enabled || brevoForm.enabled ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <XCircleIcon className="w-4 h-4" />
                      )}
                      {emailForm.enabled || mailgunForm.enabled || brevoForm.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-steel-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="w-4 h-4 text-steel-600" />
                      <span className="text-sm font-medium text-steel-700">Provider</span>
                    </div>
                    <div className="text-sm text-steel-700">
                      {mailgunForm.enabled ? 'Mailgun' : 
                       brevoForm.enabled ? 'Brevo' : 
                       emailForm.enabled ? 'SMTP' : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Help */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Configuration Help</h3>
                <div className="space-y-3 text-sm text-steel-600">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-medium text-blue-900 mb-1">Email Providers</p>
                    <p className="text-blue-800">Configure Mailgun for production or Brevo for development. Only enable one provider at a time.</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-yellow-900 mb-1">Maintenance Mode</p>
                    <p className="text-yellow-800">When enabled, only administrators can access the system.</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-900 mb-1">RFI Settings</p>
                    <p className="text-green-800">Configure default priority, numbering, and reminder settings for new RFIs.</p>
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