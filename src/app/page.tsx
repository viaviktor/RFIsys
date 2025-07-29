'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-construction rounded-xl flex items-center justify-center mb-6 mx-auto shadow-steel animate-pulse">
          <span className="text-2xl font-bold text-white">R</span>
        </div>
        <h2 className="text-3xl font-bold text-steel-900 mb-2">STEEL RFI SYSTEM</h2>
        <p className="text-steel-600">Initializing your construction dashboard...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}