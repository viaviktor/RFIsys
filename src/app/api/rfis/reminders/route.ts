import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRFIReminderEmails } from '@/lib/email'
import { addDays, isBefore, isAfter, startOfDay, differenceInDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { type, rfiId } = await request.json()

    if (!type || !['due_tomorrow', 'overdue', 'process_all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Must be "due_tomorrow", "overdue", or "process_all"' },
        { status: 400 }
      )
    }

    // If processing a specific RFI
    if (rfiId) {
      const rfi = await prisma.rFI.findUnique({
        where: { id: rfiId },
        include: {
          client: true,
          project: {
            include: {
              stakeholders: {
                include: {
                  contact: true
                }
              }
            }
          },
          createdBy: true,
          attachments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!rfi) {
        return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
      }

      if (!rfi.dateNeededBy) {
        return NextResponse.json({ error: 'RFI has no due date set' }, { status: 400 })
      }

      if (rfi.status === 'CLOSED') {
        return NextResponse.json({ error: 'RFI is already closed' }, { status: 400 })
      }

      // Get stakeholder emails, fallback to client email
      const stakeholderEmails = rfi.project.stakeholders.length > 0
        ? rfi.project.stakeholders.map(s => s.contact.email)
        : [rfi.client.email]

      const daysOverdue = type === 'overdue' 
        ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(rfi.dateNeededBy)))
        : undefined

      const result = await sendRFIReminderEmails(
        rfi as any, // Type assertion to handle Prisma's null vs undefined issue
        stakeholderEmails,
        type as 'due_tomorrow' | 'overdue',
        daysOverdue
      )

      // Log the reminder email
      if (result.success) {
        await Promise.all(stakeholderEmails.map(email => 
          prisma.emailLog.create({
            data: {
              rfiId: rfi.id,
              recipientEmail: email,
              recipientName: rfi.project.stakeholders.find(s => s.contact.email === email)?.contact.name || rfi.client.contactName,
              subject: `${type === 'overdue' ? 'OVERDUE' : 'REMINDER'}: RFI# ${rfi.rfiNumber}`,
              emailType: type === 'overdue' ? 'RFI_OVERDUE' : 'RFI_REMINDER',
              success: true
            }
          })
        ))

        // Update RFI reminder sent date
        await prisma.rFI.update({
          where: { id: rfi.id },
          data: { reminderSent: new Date() }
        })
      }

      return NextResponse.json({ 
        success: result.success, 
        message: `Reminder sent to ${stakeholderEmails.length} recipients`,
        recipients: stakeholderEmails.length,
        error: result.error
      })
    }

    // Process all RFIs for reminders
    if (type === 'process_all') {
      const results = await processAllReminders()
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'RFI ID required for individual reminders' }, { status: 400 })

  } catch (error) {
    console.error('Error sending RFI reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Process all RFIs that need reminders
async function processAllReminders() {
  const now = new Date()
  const tomorrow = addDays(startOfDay(now), 1)
  const today = startOfDay(now)

  try {
    // Find RFIs due tomorrow (for "due tomorrow" reminders)
    const rfisDueTomorrow = await prisma.rFI.findMany({
      where: {
        dateNeededBy: {
          gte: tomorrow,
          lt: addDays(tomorrow, 1)
        },
        status: {
          in: ['OPEN']
        },
        // Only send reminder if we haven't sent one in the last 24 hours
        OR: [
          { reminderSent: null },
          { reminderSent: { lt: addDays(now, -1) } }
        ]
      },
      include: {
        client: true,
        project: {
          include: {
            stakeholders: {
              include: {
                contact: true
              }
            }
          }
        },
        createdBy: true,
        attachments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    // Find overdue RFIs
    const overdueRFIs = await prisma.rFI.findMany({
      where: {
        dateNeededBy: {
          lt: today
        },
        status: {
          in: ['OPEN']
        },
        // Only send daily reminders, not if we already sent one today
        OR: [
          { reminderSent: null },
          { reminderSent: { lt: today } }
        ]
      },
      include: {
        client: true,
        project: {
          include: {
            stakeholders: {
              include: {
                contact: true
              }
            }
          }
        },
        createdBy: true,
        attachments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    const results = {
      dueTomorrowReminders: {
        count: 0,
        success: 0,
        failed: 0,
        rfis: [] as string[]
      },
      overdueReminders: {
        count: 0,
        success: 0,
        failed: 0,
        rfis: [] as string[]
      }
    }

    console.log(`📧 Processing reminders: ${rfisDueTomorrow.length} due tomorrow, ${overdueRFIs.length} overdue`)

    // Process "due tomorrow" reminders
    for (const rfi of rfisDueTomorrow) {
      results.dueTomorrowReminders.count++
      results.dueTomorrowReminders.rfis.push(rfi.rfiNumber)

      try {
        const stakeholderEmails = rfi.project.stakeholders.length > 0
          ? rfi.project.stakeholders.map(s => s.contact.email)
          : [rfi.client.email]

        const result = await sendRFIReminderEmails(rfi as any, stakeholderEmails, 'due_tomorrow')

        if (result.success) {
          results.dueTomorrowReminders.success++

          // Log emails
          await Promise.all(stakeholderEmails.map(email => 
            prisma.emailLog.create({
              data: {
                rfiId: rfi.id,
                recipientEmail: email,
                recipientName: rfi.project.stakeholders.find(s => s.contact.email === email)?.contact.name || rfi.client.contactName,
                subject: `REMINDER: RFI# ${rfi.rfiNumber}`,
                emailType: 'RFI_REMINDER',
                success: true
              }
            })
          ))

          // Update reminder sent date
          await prisma.rFI.update({
            where: { id: rfi.id },
            data: { reminderSent: now }
          })

          console.log(`✅ Due tomorrow reminder sent for RFI ${rfi.rfiNumber} to ${stakeholderEmails.length} recipients`)
        } else {
          results.dueTomorrowReminders.failed++
          console.error(`❌ Failed to send due tomorrow reminder for RFI ${rfi.rfiNumber}:`, result.error)
        }
      } catch (error) {
        results.dueTomorrowReminders.failed++
        console.error(`❌ Error processing due tomorrow reminder for RFI ${rfi.rfiNumber}:`, error)
      }
    }

    // Process overdue reminders
    for (const rfi of overdueRFIs) {
      results.overdueReminders.count++
      results.overdueReminders.rfis.push(rfi.rfiNumber)

      try {
        const stakeholderEmails = rfi.project.stakeholders.length > 0
          ? rfi.project.stakeholders.map(s => s.contact.email)
          : [rfi.client.email]

        const daysOverdue = differenceInDays(today, startOfDay(new Date(rfi.dateNeededBy!)))
        const result = await sendRFIReminderEmails(rfi as any, stakeholderEmails, 'overdue', daysOverdue)

        if (result.success) {
          results.overdueReminders.success++

          // Log emails
          await Promise.all(stakeholderEmails.map(email => 
            prisma.emailLog.create({
              data: {
                rfiId: rfi.id,
                recipientEmail: email,
                recipientName: rfi.project.stakeholders.find(s => s.contact.email === email)?.contact.name || rfi.client.contactName,
                subject: `OVERDUE: RFI# ${rfi.rfiNumber} (${daysOverdue} days overdue)`,
                emailType: 'RFI_OVERDUE',
                success: true
              }
            })
          ))

          // Update reminder sent date
          await prisma.rFI.update({
            where: { id: rfi.id },
            data: { reminderSent: now }
          })

          console.log(`🚨 Overdue reminder sent for RFI ${rfi.rfiNumber} to ${stakeholderEmails.length} recipients (${daysOverdue} days overdue)`)
        } else {
          results.overdueReminders.failed++
          console.error(`❌ Failed to send overdue reminder for RFI ${rfi.rfiNumber}:`, result.error)
        }
      } catch (error) {
        results.overdueReminders.failed++
        console.error(`❌ Error processing overdue reminder for RFI ${rfi.rfiNumber}:`, error)
      }
    }

    console.log('📊 Reminder processing completed:', results)
    return results

  } catch (error) {
    console.error('❌ Error processing all reminders:', error)
    throw error
  }
}

export async function GET() {
  try {
    // Return summary of RFIs that need reminders
    const now = new Date()
    const tomorrow = addDays(startOfDay(now), 1)
    const today = startOfDay(now)

    const dueTomorrowCount = await prisma.rFI.count({
      where: {
        dateNeededBy: {
          gte: tomorrow,
          lt: addDays(tomorrow, 1)
        },
        status: {
          in: ['OPEN']
        }
      }
    })

    const overdueCount = await prisma.rFI.count({
      where: {
        dateNeededBy: {
          lt: today
        },
        status: {
          in: ['OPEN']
        }
      }
    })

    return NextResponse.json({
      dueTomorrow: dueTomorrowCount,
      overdue: overdueCount,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Error getting reminder summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}