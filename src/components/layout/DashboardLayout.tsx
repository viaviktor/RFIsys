'use client'

import { Navigation } from './Navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-full bg-steel-50">
      <Navigation />
      
      {/* Main content area */}
      <div className="lg:pl-64 h-full">
        <main className="flex-1 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}