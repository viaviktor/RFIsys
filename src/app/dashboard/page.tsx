'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InternalDashboard } from '@/components/dashboards/InternalDashboard'
import { StakeholderDashboard } from '@/components/dashboards/StakeholderDashboard'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-steel-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Render different dashboards based on user type and role
  const renderDashboard = () => {
    // Internal users (staff)
    if (user.userType === 'internal') {
      return <InternalDashboard />
    }
    
    // External stakeholders
    if (user.userType === 'stakeholder') {
      if (user.role === 'STAKEHOLDER_L1') {
        return <StakeholderDashboard userType="STAKEHOLDER_L1" />
      } else if (user.role === 'STAKEHOLDER_L2') {
        return <StakeholderDashboard userType="STAKEHOLDER_L2" />
      }
    }

    // Fallback to internal dashboard
    return <InternalDashboard />
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {renderDashboard()}
      </div>
    </DashboardLayout>
  )
}