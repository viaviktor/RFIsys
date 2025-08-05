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
export async function processRFIReminders(reminderType: 'all' | 'overdue_only' = 'all'): Promise<void> {
  try {
    console.log(`📧 Processing RFI reminders (${reminderType})...`)
    
    const response = await fetch(`${appConfig.url}/api/rfis/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        type: 'process_all',
        reminderType // Pass the type to the API
      })
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

  // Tuesday morning overdue reminders at 8:00 AM Pacific Time
  const tuesdayOverdueJob = createCronJob({
    name: 'rfi-overdue-tuesday',
    schedule: '0 8 * * 2', // Tuesday at 8:00 AM (2 = Tuesday in cron)
    handler: () => processRFIReminders('overdue_only'),
    timezone: 'America/Los_Angeles', // Pacific Time
    runOnInit: false
  })

  // Wednesday morning overdue reminders at 8:00 AM Pacific Time
  const wednesdayOverdueJob = createCronJob({
    name: 'rfi-overdue-wednesday',
    schedule: '0 8 * * 3', // Wednesday at 8:00 AM (3 = Wednesday in cron)
    handler: () => processRFIReminders('overdue_only'),
    timezone: 'America/Los_Angeles', // Pacific Time
    runOnInit: false
  })

  // Daily "due tomorrow" reminders at 3:00 PM Pacific Time (for next business day)
  const dueTomorrowJob = createCronJob({
    name: 'rfi-due-tomorrow',
    schedule: '0 15 * * 1-5', // Weekdays at 3:00 PM
    handler: () => processRFIReminders('all'),
    timezone: 'America/Los_Angeles', // Pacific Time
    runOnInit: false
  })

  startCronJob('rfi-overdue-tuesday', tuesdayOverdueJob)
  startCronJob('rfi-overdue-wednesday', wednesdayOverdueJob)
  startCronJob('rfi-due-tomorrow', dueTomorrowJob)
  
  console.log('✅ RFI reminder cron jobs initialized:')
  console.log('   - Overdue reminders: Tuesday & Wednesday at 8:00 AM Pacific')
  console.log('   - Due tomorrow reminders: Weekdays at 3:00 PM Pacific')
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