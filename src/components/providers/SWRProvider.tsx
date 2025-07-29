'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global error retry configuration
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        
        // Global error retry handler
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry on 404
          if (error.status === 404) return
          
          // Don't retry on network errors after 3 attempts
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            if (retryCount >= 3) {
              return
            }
          }
          
          // Don't retry more than 3 times for any error
          if (retryCount >= 3) return
          
          // Retry with exponential backoff
          setTimeout(() => revalidate({ retryCount }), Math.pow(2, retryCount) * 1000)
        },
        
        // Global error handler
        onError: (error, key) => {
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            // Don't show error to user for network issues during background refresh
            return
          }
          
          // Silently handle other errors - could be logged to external service in production
        },
        
        // Optimized revalidation settings
        revalidateIfStale: true,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateOnMount: true,
        
        // Increase deduping interval to reduce duplicate requests
        dedupingInterval: 5000, // 5 seconds
        
        // Add loading timeout
        loadingTimeout: 15000, // 15 seconds
        
        // Cache optimization
        focusThrottleInterval: 5000,
        
        // Background updates
        refreshInterval: 0, // Disable automatic refresh - let components decide
      }}
    >
      {children}
    </SWRConfig>
  )
}