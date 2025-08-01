import { CronJob } from 'cron'
import { appConfig } from './env'

// Store active cron jobs
const activeCronJobs: Map<string, CronJob> = new Map()

export interface CronJobConfig {
  name: string
  schedule: string // Cron expression
  handler: () => Promise<void>
  timezone?: string
  runOnInit?: boolean
}

export function createCronJob(config: CronJobConfig): CronJob {
  const job = new CronJob(
    config.schedule,
    async () => {
      console.log(`🕐 Running cron job: ${config.name} at ${new Date().toISOString()}`)
      try {
        await config.handler()
        console.log(`✅ Cron job completed: ${config.name}`)
      } catch (error) {
        console.error(`❌ Cron job failed: ${config.name}`, error)
      }
    },
    null, // onComplete
    false, // start
    config.timezone || 'America/New_York', // timezone
    null, // context
    config.runOnInit || false // runOnInit
  )

  return job
}

export function startCronJob(name: string, job: CronJob): void {
  if (activeCronJobs.has(name)) {
    console.log(`⚠️  Cron job ${name} is already running, skipping`)
    return
  }

  activeCronJobs.set(name, job)
  job.start()
  console.log(`🚀 Started cron job: ${name}`)
}

export function stopCronJob(name: string): void {
  const job = activeCronJobs.get(name)
  if (job) {
    job.stop()
    activeCronJobs.delete(name)
    console.log(`🛑 Stopped cron job: ${name}`)
  }
}

export function stopAllCronJobs(): void {
  activeCronJobs.forEach((job, name) => {
    job.stop()
    console.log(`🛑 Stopped cron job: ${name}`)
  })
  activeCronJobs.clear()
}

export function getActiveCronJobs(): string[] {
  return Array.from(activeCronJobs.keys())
}

// RFI Reminder cron job handler
export async function processRFIReminders(): Promise<void> {
  try {
    console.log('📧 Processing RFI reminders...')
    
    const response = await fetch(`${appConfig.url}/api/rfis/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'process_all' })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const results = await response.json()
    
    console.log('📊 RFI reminder processing results:', {
      dueTomorrow: `${results.dueTomorrowReminders.success}/${results.dueTomorrowReminders.count} sent`,
      overdue: `${results.overdueReminders.success}/${results.overdueReminders.count} sent`,
      totalFailed: results.dueTomorrowReminders.failed + results.overdueReminders.failed
    })

    if (results.dueTomorrowReminders.failed > 0 || results.overdueReminders.failed > 0) {
      console.error('⚠️  Some reminder emails failed to send')
    }

  } catch (error) {
    console.error('❌ Failed to process RFI reminders via cron:', error)
    throw error
  }
}

// Initialize RFI reminder cron jobs
export function initializeRFIReminderCron(): void {
  if (!appConfig.features.emailNotifications) {
    console.log('📧 Email notifications disabled, skipping RFI reminder cron setup')
    return
  }

  // Daily reminder job at 8:00 AM Eastern Time
  const reminderJob = createCronJob({
    name: 'rfi-reminders',
    schedule: '0 8 * * *', // Every day at 8:00 AM
    handler: processRFIReminders,
    timezone: 'America/New_York',
    runOnInit: false
  })

  startCronJob('rfi-reminders', reminderJob)
  
  console.log('✅ RFI reminder cron job initialized - runs daily at 8:00 AM Eastern')
}

// Cleanup function for graceful shutdown
export function shutdownCronJobs(): void {
  console.log('🔄 Shutting down cron jobs...')
  stopAllCronJobs()
  console.log('✅ All cron jobs stopped')
}

// Track if shutdown handlers have been registered
let shutdownHandlersRegistered = false

// Handle graceful shutdown
if (typeof process !== 'undefined' && !shutdownHandlersRegistered) {
  process.once('SIGINT', shutdownCronJobs)
  process.once('SIGTERM', shutdownCronJobs)
  shutdownHandlersRegistered = true
}