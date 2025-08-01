import { initializeRFIReminderCron } from './cron'

// Track if services have been initialized
let servicesInitialized = false

// Initialize background services
export function initializeServices(): void {
  // Prevent multiple initializations
  if (servicesInitialized) {
    return
  }
  
  console.log('🚀 Initializing background services...')
  
  try {
    // Initialize RFI reminder cron jobs
    initializeRFIReminderCron()
    
    servicesInitialized = true
    console.log('✅ Background services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize background services:', error)
  }
}

// Call this in the main app startup
if (typeof window === 'undefined' && !process.env.SKIP_ENV_VALIDATION && process.env.NODE_ENV !== 'test') {
  // Only run on server side and not during build or tests
  initializeServices()
}