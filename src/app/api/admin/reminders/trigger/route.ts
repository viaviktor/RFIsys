import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { processRFIReminders } from '@/lib/cron'

export async function POST(request: NextRequest) {
  try {
    // Authenticate and check admin permissions
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { reminderType = 'all' } = await request.json()

    console.log(`🔧 Manually triggering RFI reminders (${reminderType}) by ${user.email}`)

    // Call the reminder processing function directly
    await processRFIReminders(reminderType)

    return NextResponse.json({ 
      success: true,
      message: `Reminder processing triggered for ${reminderType} reminders`,
      triggeredBy: user.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error manually triggering reminders:', error)
    return NextResponse.json(
      { error: 'Failed to trigger reminders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate and check admin permissions
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return information about the cron schedule
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      currentDay: daysOfWeek[dayOfWeek],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cronSchedule: {
        overdueReminders: {
          days: ['Tuesday', 'Wednesday'],
          time: '8:00 AM Pacific',
          timezone: 'America/Los_Angeles',
          description: 'Sends reminders for all overdue RFIs'
        },
        dueTomorrowReminders: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          time: '3:00 PM Pacific',
          timezone: 'America/Los_Angeles',
          description: 'Sends reminders for RFIs due the next business day'
        }
      },
      manualTrigger: {
        endpoint: '/api/admin/reminders/trigger',
        method: 'POST',
        body: {
          reminderType: 'all | overdue_only'
        }
      }
    })

  } catch (error) {
    console.error('Error getting reminder info:', error)
    return NextResponse.json(
      { error: 'Failed to get reminder info' },
      { status: 500 }
    )
  }
}