'use client'

import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ErrorFallbackProps {
  error: Error
  resetError?: () => void
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div>
      <div>
        <div>
          <ExclamationTriangleIcon />
        </div>
        <h2>
          Something went wrong
        </h2>
        <p>
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details>
            <summary>
              Error details (development only)
            </summary>
            <pre>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div>
          {resetError && (
            <button
              onClick={resetError}
           >
              Try again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
         >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || ErrorFallback
      return (
        <Fallback 
          error={this.state.error} 
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

// Hook for functional components that need error boundary functionality
export function useErrorHandler() {
  return (error: Error) => {
    // In a real app, you might want to show a toast notification
    // or trigger some other error handling logic
    
    throw error // Re-throw to let error boundary catch it
  }
}