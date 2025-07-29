import { prisma } from './prisma'

// Email usage tracking for Brevo free tier management
export interface DailyEmailUsage {
  date: string
  sent: number
  limit: number
  provider: 'brevo' | 'fallback'
}

// Track email sent
export async function trackEmailSent(provider: 'brevo' | 'fallback' = 'brevo'): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  try {
    // Try to update existing record
    const updated = await prisma.emailUsage.updateMany({
      where: {
        date: today,
        provider,
      },
      data: {
        sent: {
          increment: 1,
        },
      },
    })

    // If no record exists, create one
    if (updated.count === 0) {
      await prisma.emailUsage.create({
        data: {
          date: today,
          provider,
          sent: 1,
          limit: provider === 'brevo' ? 300 : 9999, // Brevo free tier: 300/day
        },
      })
    }
  } catch (error) {
    console.error('Failed to track email usage:', error)
    // Don't throw - we don't want email tracking failures to break email sending
  }
}

// Get current daily usage
export async function getDailyEmailUsage(provider: 'brevo' | 'fallback' = 'brevo'): Promise<DailyEmailUsage> {
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const usage = await prisma.emailUsage.findFirst({
      where: {
        date: today,
        provider,
      },
    })

    if (usage) {
      return {
        date: usage.date,
        sent: usage.sent,
        limit: usage.limit,
        provider: usage.provider as 'brevo' | 'fallback',
      }
    }

    // Return default if no record exists
    return {
      date: today,
      sent: 0,
      limit: provider === 'brevo' ? 300 : 9999,
      provider,
    }
  } catch (error) {
    console.error('Failed to get email usage:', error)
    // Return conservative estimates on error
    return {
      date: today,
      sent: 250, // Assume near limit to be safe
      limit: provider === 'brevo' ? 300 : 9999,
      provider,
    }
  }
}

// Check if we can send more emails today
export async function canSendEmail(provider: 'brevo' | 'fallback' = 'brevo', buffer: number = 10): Promise<boolean> {
  const usage = await getDailyEmailUsage(provider)
  return usage.sent < (usage.limit - buffer)
}

// Get email usage statistics for admin dashboard
export async function getEmailUsageStats(days: number = 7): Promise<DailyEmailUsage[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  try {
    const usage = await prisma.emailUsage.findMany({
      where: {
        date: {
          gte: startDateStr,
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return usage.map(u => ({
      date: u.date,
      sent: u.sent,
      limit: u.limit,
      provider: u.provider as 'brevo' | 'fallback',
    }))
  } catch (error) {
    console.error('Failed to get email usage stats:', error)
    return []
  }
}

// Reset usage for testing (admin only)
export async function resetDailyUsage(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  try {
    await prisma.emailUsage.deleteMany({
      where: {
        date: targetDate,
      },
    })
    console.log(`Reset email usage for ${targetDate}`)
  } catch (error) {
    console.error('Failed to reset email usage:', error)
    throw error
  }
}

// Email queue for when we hit daily limits
export interface QueuedEmail {
  id: string
  rfiId: string
  recipients: string[]
  scheduledFor: Date
  priority: 'normal' | 'high' | 'urgent'
  attempts: number
  lastAttempt?: Date
  error?: string
}

// Queue email for later sending
export async function queueEmailForLater(
  rfiId: string,
  recipients: string[],
  scheduledFor: Date,
  priority: 'normal' | 'high' | 'urgent' = 'normal'
): Promise<string> {
  try {
    const queuedEmail = await prisma.emailQueue.create({
      data: {
        rfiId,
        recipients,
        scheduledFor,
        priority,
        attempts: 0,
      },
    })

    console.log(`Email queued for RFI ${rfiId}, scheduled for ${scheduledFor.toISOString()}`)
    return queuedEmail.id
  } catch (error) {
    console.error('Failed to queue email:', error)
    throw error
  }
}

// Process queued emails (to be called by cron job)
export async function processEmailQueue(limit: number = 10): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  try {
    // Get emails that are ready to send
    const now = new Date()
    const queuedEmails = await prisma.emailQueue.findMany({
      where: {
        scheduledFor: {
          lte: now,
        },
        attempts: {
          lt: 3, // Max 3 attempts
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' },
      ],
      take: limit,
      include: {
        rfi: {
          include: {
            client: true,
            project: true,
            createdBy: true,
          },
        },
      },
    })

    console.log(`Processing ${queuedEmails.length} queued emails`)

    for (const queuedEmail of queuedEmails) {
      try {
        // Check if we can still send today
        const canSend = await canSendEmail('brevo', 5)
        if (!canSend) {
          console.log('Daily limit reached, stopping queue processing')
          break
        }

        // Send the email
        const { sendRFIEmailSmart } = await import('./brevo-email')
        const result = await sendRFIEmailSmart(queuedEmail.rfi as any, queuedEmail.recipients)

        if (result.success) {
          // Remove from queue
          await prisma.emailQueue.delete({
            where: { id: queuedEmail.id },
          })
          processed++
          console.log(`✅ Sent queued email for RFI ${queuedEmail.rfiId}`)
        } else {
          // Update attempt count and error
          await prisma.emailQueue.update({
            where: { id: queuedEmail.id },
            data: {
              attempts: queuedEmail.attempts + 1,
              lastAttempt: new Date(),
              error: result.error,
            },
          })
          errors++
          console.log(`❌ Failed to send queued email for RFI ${queuedEmail.rfiId}: ${result.error}`)
        }
      } catch (error) {
        console.error(`Error processing queued email ${queuedEmail.id}:`, error)
        
        // Update attempt count
        await prisma.emailQueue.update({
          where: { id: queuedEmail.id },
          data: {
            attempts: queuedEmail.attempts + 1,
            lastAttempt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        errors++
      }
    }

    // Clean up failed emails (3+ attempts)
    const cleaned = await prisma.emailQueue.deleteMany({
      where: {
        attempts: {
          gte: 3,
        },
      },
    })

    if (cleaned.count > 0) {
      console.log(`Cleaned up ${cleaned.count} failed emails from queue`)
    }

  } catch (error) {
    console.error('Error processing email queue:', error)
  }

  return { processed, errors }
}

// Get queue status for admin dashboard
export async function getEmailQueueStatus(): Promise<{
  pending: number
  scheduled: number
  failed: number
  nextScheduled?: Date
}> {
  try {
    const [pending, scheduled, failed, next] = await Promise.all([
      prisma.emailQueue.count({
        where: {
          scheduledFor: {
            lte: new Date(),
          },
          attempts: {
            lt: 3,
          },
        },
      }),
      prisma.emailQueue.count({
        where: {
          scheduledFor: {
            gt: new Date(),
          },
          attempts: {
            lt: 3,
          },
        },
      }),
      prisma.emailQueue.count({
        where: {
          attempts: {
            gte: 3,
          },
        },
      }),
      prisma.emailQueue.findFirst({
        where: {
          scheduledFor: {
            gt: new Date(),
          },
          attempts: {
            lt: 3,
          },
        },
        orderBy: {
          scheduledFor: 'asc',
        },
        select: {
          scheduledFor: true,
        },
      }),
    ])

    return {
      pending,
      scheduled,
      failed,
      nextScheduled: next?.scheduledFor,
    }
  } catch (error) {
    console.error('Failed to get email queue status:', error)
    return {
      pending: 0,
      scheduled: 0,
      failed: 0,
    }
  }
}