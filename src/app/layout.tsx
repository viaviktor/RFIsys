import type { Metadata } from 'next'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

// Initialize background services (cron jobs, etc.)
import '@/lib/init'

export const metadata: Metadata = {
  title: 'STEEL RFI - Industrial Request for Information System',
  description: 'Heavy-duty RFI management system for steel construction and industrial projects',
  keywords: ['RFI', 'steel construction', 'industrial', 'heavy construction', 'project management'],
  authors: [{ name: 'Steel RFI System' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <ErrorBoundary>
          <SWRProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}