import { initializeRFIReminderCron } from './cron'

// Initialize background services
export function initializeServices(): void {
  console.log('🚀 Initializing background services...')
  
  try {
    // Initialize RFI reminder cron jobs
    initializeRFIReminderCron()
    
    console.log('✅ Background services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize background services:', error)
  }
}

// Call this in the main app startup
if (typeof window === 'undefined' && !process.env.SKIP_ENV_VALIDATION) {
  // Only run on server side and not during build
  initializeServices()
}