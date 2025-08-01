'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { format } from 'date-fns'
import { 
  EnvelopeIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface EmailStats {
  totalSent: number
  successRate: number
  todaySent: number
  weekSent: number
  failedToday: number
  lastSent?: string
  provider: string
  status: 'active' | 'error' | 'disabled'
}

interface EmailProvider {
  name: string
  status: 'enabled' | 'disabled' | 'error'
  type: 'smtp' | 'mailgun' | 'brevo'
  description: string
  features: string[]
  config?: {
    host?: string
    port?: number
    from?: string
    domain?: string
    replyDomain?: string
  }
}

export default function EmailSystemPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { settings } = useSettings()
  
  const [emailStats, setEmailStats] = useState<EmailStats>({
    totalSent: 0,
    successRate: 95,
    todaySent: 0,
    weekSent: 0,
    failedToday: 0,
    provider: 'None',
    status: 'disabled'
  })
  
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [testResults, setTestResults] = useState<{[key: string]: any}>({})

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!authLoading && isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    // Mock email stats - in real implementation, fetch from API
    if (settings && Object.keys(settings).length > 0) {
      const smtpEnabled = settings.email?.enabled?.value === 'true'
      const mailgunEnabled = settings.mailgun?.enabled?.value === 'true'
      const brevoEnabled = settings.brevo?.enabled?.value === 'true'
      
      let provider = 'None'
      let status: 'active' | 'error' | 'disabled' = 'disabled'
      
      if (mailgunEnabled) {
        provider = 'Mailgun'
        status = 'active'
      } else if (brevoEnabled) {
        provider = 'Brevo'
        status = 'active'
      } else if (smtpEnabled) {
        provider = 'SMTP'
        status = 'active'
      }
      
      setEmailStats({
        totalSent: 1250,
        successRate: 97.2,
        todaySent: 45,
        weekSent: 312,
        failedToday: 2,
        lastSent: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        provider,
        status
      })
      setIsLoadingStats(false)
    }
  }, [settings])

  const getEmailProviders = (): EmailProvider[] => {
    if (!settings) return []
    
    const getSettingValue = (category: string, key: string) => settings[category]?.[key]?.value || ''
    
    return [
      {
        name: 'SMTP',
        status: getSettingValue('email', 'enabled') === 'true' ? 'enabled' : 'disabled',
        type: 'smtp',
        description: 'Standard SMTP email delivery for development and basic needs',
        features: ['Basic email delivery', 'Custom SMTP servers', 'Development friendly'],
        config: {
          host: getSettingValue('email', 'host'),
          port: parseInt(getSettingValue('email', 'port')) || 587,
          from: getSettingValue('email', 'from')
        }
      },
      {
        name: 'Mailgun',
        status: getSettingValue('mailgun', 'enabled') === 'true' ? 'enabled' : 'disabled',
        type: 'mailgun',
        description: 'Professional email delivery with advanced analytics and webhooks',
        features: ['Reply-by-email', 'Email tracking', 'High deliverability', 'Analytics'],
        config: {
          domain: getSettingValue('mailgun', 'domain'),
          replyDomain: getSettingValue('mailgun', 'replyDomain')
        }
      },
      {
        name: 'Brevo',
        status: getSettingValue('brevo', 'enabled') === 'true' ? 'enabled' : 'disabled',
        type: 'brevo',
        description: 'Free tier email service with 300 emails per day limit',
        features: ['Reply-by-email', 'Free tier', 'Template support', 'Contact management'],
        config: {
          replyDomain: getSettingValue('brevo', 'replyDomain')
        }
      }
    ]
  }

  const handleTestEmail = async (provider: string) => {
    setTestResults({ ...testResults, [provider]: { testing: true } })
    
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider, testEmail: user?.email })
      })
      
      const result = await response.json()
      setTestResults({ ...testResults, [provider]: result })
    } catch (error) {
      setTestResults({ 
        ...testResults, 
        [provider]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      })
    }
  }

  const refreshStats = async () => {
    setIsLoadingStats(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoadingStats(false)
  }

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

  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-8 max-w-md w-full text-center">
              <h2 className="text-xl font-bold text-steel-900 mb-2">Access Denied</h2>
              <p className="text-steel-600 mb-4">You don't have permission to access this page.</p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const providers = getEmailProviders()
  const activeProvider = providers.find(p => p.status === 'enabled')

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  Email System Management
                </h1>
                <p className="text-steel-600">
                  Monitor email delivery, manage providers, and configure email settings
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  leftIcon={<ArrowPathIcon className="w-5 h-5" />}
                  onClick={refreshStats}
                  disabled={isLoadingStats}
                >
                  {isLoadingStats ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Link href="/dashboard/admin/settings#email">
                  <Button variant="primary" leftIcon={<Cog6ToothIcon className="w-5 h-5" />}>
                    Configure
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <EnvelopeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Sent</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {isLoadingStats ? '...' : emailStats.totalSent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className={`stat-icon ${
                  emailStats.successRate >= 95 ? 'bg-safety-green text-white' : 
                  emailStats.successRate >= 90 ? 'bg-safety-yellow text-steel-900' : 
                  'bg-safety-red text-white'
                }`}>
                  <ChartBarIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Success Rate</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {isLoadingStats ? '...' : `${emailStats.successRate}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-blue text-white">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Today</p>
                  <p className="text-2xl font-bold text-steel-900">
                    {isLoadingStats ? '...' : emailStats.todaySent}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className={`stat-icon ${
                  emailStats.status === 'active' ? 'bg-safety-green text-white' :
                  emailStats.status === 'error' ? 'bg-safety-red text-white' :
                  'bg-steel-400 text-white'
                }`}>
                  <ServerIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Status</p>
                  <p className="text-sm font-bold text-steel-900">
                    {isLoadingStats ? 'Loading...' : emailStats.provider}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content space-y-6">
            {/* Current Provider Status */}
            {activeProvider && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-steel-900">Active Email Provider</h3>
                      <p className="text-steel-600 text-sm">{activeProvider.name} is currently handling email delivery</p>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-steel-900 mb-2">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        {activeProvider.config?.host && (
                          <div className="flex justify-between">
                            <span className="text-steel-600">Host:</span>
                            <span className="font-mono">{activeProvider.config.host}</span>
                          </div>
                        )}
                        {activeProvider.config?.port && (
                          <div className="flex justify-between">
                            <span className="text-steel-600">Port:</span>
                            <span className="font-mono">{activeProvider.config.port}</span>
                          </div>
                        )}
                        {activeProvider.config?.domain && (
                          <div className="flex justify-between">
                            <span className="text-steel-600">Domain:</span>
                            <span className="font-mono">{activeProvider.config.domain}</span>
                          </div>
                        )}
                        {activeProvider.config?.from && (
                          <div className="flex justify-between">
                            <span className="text-steel-600">From:</span>
                            <span className="font-mono">{activeProvider.config.from}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-steel-900 mb-2">Features</h4>
                      <ul className="space-y-1 text-sm">
                        {activeProvider.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-steel-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-steel-200 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleTestEmail(activeProvider.type)}
                      disabled={testResults[activeProvider.type]?.testing}
                      leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                    >
                      {testResults[activeProvider.type]?.testing ? 'Testing...' : 'Send Test Email'}
                    </Button>
                    
                    {testResults[activeProvider.type] && !testResults[activeProvider.type].testing && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        testResults[activeProvider.type].success 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className={`flex items-center gap-2 text-sm font-medium ${
                          testResults[activeProvider.type].success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {testResults[activeProvider.type].success ? (
                            <CheckCircleIcon className="w-4 h-4" />
                          ) : (
                            <XCircleIcon className="w-4 h-4" />
                          )}
                          {testResults[activeProvider.type].success ? 'Test email sent successfully!' : 'Test failed'}
                        </div>
                        {testResults[activeProvider.type].message && (
                          <p className={`text-xs mt-1 ${
                            testResults[activeProvider.type].success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {testResults[activeProvider.type].message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Provider Comparison */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-steel-900">Available Email Providers</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {providers.map((provider) => (
                    <div 
                      key={provider.name}
                      className={`border rounded-lg p-4 ${
                        provider.status === 'enabled' 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-steel-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-steel-900">{provider.name}</h4>
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          provider.status === 'enabled' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-steel-100 text-steel-600'
                        }`}>
                          {provider.status === 'enabled' ? (
                            <CheckCircleIcon className="w-3 h-3" />
                          ) : (
                            <XCircleIcon className="w-3 h-3" />
                          )}
                          {provider.status}
                        </div>
                      </div>
                      
                      <p className="text-sm text-steel-600 mb-3">{provider.description}</p>
                      
                      <ul className="space-y-1">
                        {provider.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="text-xs text-steel-600 flex items-center gap-1">
                            <div className="w-1 h-1 bg-steel-400 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <Link href="/dashboard/admin/settings#providers">
                    <Button variant="outline">Configure Providers</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-steel-600">This Week:</span>
                    <span className="font-medium">{emailStats.weekSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Failed Today:</span>
                    <span className={`font-medium ${emailStats.failedToday > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {emailStats.failedToday}
                    </span>
                  </div>
                  {emailStats.lastSent && (
                    <div className="flex justify-between">
                      <span className="text-steel-600">Last Sent:</span>
                      <span className="font-medium text-xs">
                        {format(new Date(emailStats.lastSent), 'HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">System Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      emailStats.status === 'active' ? 'bg-green-500' : 
                      emailStats.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-steel-700">
                      Email Service {emailStats.status === 'active' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-steel-700">Database Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-steel-700">Queue Processing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/admin/settings#email">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
                    >
                      SMTP Settings
                    </Button>
                  </Link>
                  <Link href="/dashboard/admin/settings#providers">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<ServerIcon className="w-4 h-4" />}
                    >
                      Provider Config
                    </Button>
                  </Link>
                  <Link href="/dashboard/admin/reminders">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      leftIcon={<ClockIcon className="w-4 h-4" />}
                    >
                      Email Reminders
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Documentation */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Documentation</h3>
                <div className="space-y-2 text-sm">
                  <a href="#" className="flex items-center gap-2 text-orange-600 hover:text-orange-700">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>Email Setup Guide</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 text-orange-600 hover:text-orange-700">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>Webhook Configuration</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 text-orange-600 hover:text-orange-700">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>Troubleshooting</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}