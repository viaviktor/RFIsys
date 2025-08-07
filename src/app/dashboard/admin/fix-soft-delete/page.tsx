'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'

export default function FixSoftDeletePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  // Wait for auth to load
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

  // Redirect if not admin after auth loads
  if (!user || user.role !== 'ADMIN') {
    router.push('/dashboard')
    return null
  }

  const fixContacts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/fix-contact-soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
        credentials: 'include'
      })
      const data = await response.json()
      setResults({ type: 'contacts', ...data })
    } catch (error) {
      console.error('Failed to fix contacts:', error)
      setResults({ type: 'contacts', error: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  const fixUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/fix-user-soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
        credentials: 'include'
      })
      const data = await response.json()
      setResults({ type: 'users', ...data })
    } catch (error) {
      console.error('Failed to fix users:', error)
      setResults({ type: 'users', error: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">Fix Soft Delete Issues</h1>
            <p className="text-steel-600 mt-2">
              Fix entities that were deleted with the old system (active=false only) 
              to use proper soft-delete (with deletedAt timestamp).
            </p>
          </div>
          <div className="card-body space-y-6">
            <div className="border border-steel-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Fix Contacts</h2>
              <p className="text-sm text-steel-600 mb-4">
                Fixes contacts that have active=false but no deletedAt timestamp.
                This resolves "client has contacts" errors when trying to delete clients.
              </p>
              <Button 
                onClick={fixContacts} 
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Processing...' : 'Fix Contact Soft-Delete Issues'}
              </Button>
            </div>

            <div className="border border-steel-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Fix Users</h2>
              <p className="text-sm text-steel-600 mb-4">
                Fixes users that have active=false but no deletedAt timestamp.
                This removes inactive users from appearing in lists.
              </p>
              <Button 
                onClick={fixUsers} 
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Processing...' : 'Fix User Soft-Delete Issues'}
              </Button>
            </div>

            {results && (
              <div className={`border rounded-lg p-4 ${results.error ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
                <h3 className="font-semibold mb-2">
                  {results.error ? '❌ Error' : '✅ Success'} - {results.type}
                </h3>
                {results.error ? (
                  <p className="text-red-700">{results.error}</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <p>{results.message}</p>
                    <p>Fixed: {results.fixed}</p>
                    <p>Failed: {results.failed}</p>
                    <p>Remaining broken: {results.remainingBroken}</p>
                    {results.fixedContacts && (
                      <div className="mt-2">
                        <p className="font-medium">Fixed contacts:</p>
                        <ul className="list-disc list-inside">
                          {results.fixedContacts.map((c: any) => (
                            <li key={c.id}>{c.name} ({c.email})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {results.fixedUsers && (
                      <div className="mt-2">
                        <p className="font-medium">Fixed users:</p>
                        <ul className="list-disc list-inside">
                          {results.fixedUsers.map((u: any) => (
                            <li key={u.id}>{u.name} ({u.email})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}