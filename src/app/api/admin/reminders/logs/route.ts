import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view reminder logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'all'

    // Build where clause
    const where: any = {
      OR: [
        { reminderSent: { not: null } },
        { reminderSent: { not: null } }
      ]
    }

    if (status === 'overdue') {
      where.dueDate = { lt: new Date() }
      where.status = 'OPEN'
    } else if (status === 'reminded') {
      where.reminderSent = { not: null }
    }

    // Get total count
    const total = await prisma.rFI.count({ where })

    // Get RFIs with reminder history
    const rfis = await prisma.rFI.findMany({
      where,
      include: {
        client: true,
        project: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { reminderSent: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    // Get email logs for these RFIs
    const rfiIds = rfis.map(rfi => rfi.id)
    const emailLogs = await prisma.emailLog.findMany({
      where: {
        AND: [
          { rfiId: { in: rfiIds } },
          { subject: { contains: 'Reminder' } }
        ]
      },
      orderBy: { sentAt: 'desc' }
    })

    // Group email logs by RFI
    const emailLogsByRfi = emailLogs.reduce((acc, log) => {
      if (!acc[log.rfiId!]) acc[log.rfiId!] = []
      acc[log.rfiId!].push(log)
      return acc
    }, {} as Record<string, typeof emailLogs>)

    // Format response
    const formattedRfis = rfis.map(rfi => ({
      id: rfi.id,
      rfiNumber: rfi.rfiNumber,
      title: rfi.title,
      status: rfi.status,
      dueDate: rfi.dueDate,
      reminderSent: rfi.reminderSent,
      client: {
        id: rfi.client.id,
        name: rfi.client.name
      },
      project: {
        id: rfi.project.id,
        name: rfi.project.name
      },
      createdBy: rfi.createdBy,
      emailLogs: emailLogsByRfi[rfi.id] || []
    }))

    // Get summary statistics
    const stats = {
      totalReminders: await prisma.rFI.count({
        where: { reminderSent: { not: null } }
      }),
      totalOverdue: await prisma.rFI.count({
        where: {
          dueDate: { lt: new Date() },
          status: 'OPEN'
        }
      }),
      remindersToday: await prisma.rFI.count({
        where: {
          reminderSent: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      recentReminders: await prisma.emailLog.count({
        where: {
          subject: { contains: 'Reminder' },
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    }

    return NextResponse.json({
      logs: formattedRfis,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats
    })
  } catch (error) {
    console.error('Failed to fetch reminder logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminder logs' },
      { status: 500 }
    )
  }
}