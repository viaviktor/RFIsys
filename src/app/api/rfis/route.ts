import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { RFIStatus, Priority, RFIDirection, RFIUrgency } from '@prisma/client'
import { cache, createCachedResponse } from '@/lib/cache'
import { withTiming, timeApiRequest } from '@/lib/performance'
import { getUserRFIs, applyProjectFilter } from '@/lib/permissions'
import { SOFT_DELETE_FILTERS } from '@/lib/soft-delete'

export async function GET(request: NextRequest) {
  const timer = timeApiRequest('GET /api/rfis')
  
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Filters
    const status = searchParams.get('status') as RFIStatus | null
    const priority = searchParams.get('priority') as Priority | null
    const urgency = searchParams.get('urgency') as RFIUrgency | null
    const direction = searchParams.get('direction') as RFIDirection | null
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const createdById = searchParams.get('createdById')
    const overdue = searchParams.get('overdue') === 'true'

    // Create cache key
    const cacheKey = `rfis:${user.id}:${page}:${limit}:${JSON.stringify({
      status, priority, urgency, direction, clientId, projectId, search, createdById, overdue
    })}`

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) {
      return createCachedResponse(cached, { maxAge: 60 })
    }

    // Build where clause with soft delete filtering
    const where: any = {
      ...SOFT_DELETE_FILTERS.ACTIVE_ONLY
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (urgency) where.urgency = urgency
    if (direction) where.direction = direction
    if (clientId) where.clientId = clientId
    if (projectId) where.projectId = projectId
    if (createdById) where.createdById = createdById

    // Handle date filters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // Handle overdue filter first
    if (overdue) {
      if (!where.AND) where.AND = []
      where.AND.push(
        { dueDate: { lt: new Date() } },
        { status: { not: RFIStatus.CLOSED } }
      )
    } else if (dateFrom || dateTo) {
      // Only apply date range if not overdue filter
      const dateFilter: any = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.dueDate = dateFilter
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { rfiNumber: { contains: search, mode: 'insensitive' } },
        { suggestedSolution: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Apply project-based filtering for stakeholders
    const filteredQuery = applyProjectFilter({ where }, user)

    // Get RFIs with pagination - optimized query
    const [rfis, total] = await withTiming('db:rfis:findMany', () => Promise.all([
      prisma.rFI.findMany({
        where: filteredQuery.where,
        select: {
          id: true,
          rfiNumber: true,
          title: true,
          description: true,
          suggestedSolution: true,
          status: true,
          priority: true,
          direction: true,
          urgency: true,
          dateNeededBy: true,
          dateSent: true,
          dateReceived: true,
          reminderSent: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              contactName: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          responses: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              size: true,
              mimeType: true,
              createdAt: true,
            },
            take: 5,
          },
          _count: {
            select: { 
              responses: true,
              attachments: true,
            },
          },
        },
        orderBy: [
          { urgency: 'desc' },
          { priority: 'desc' },
          { dateNeededBy: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.rFI.count({ where: filteredQuery.where }),
    ]), { filters: { status, priority, urgency, direction, clientId, projectId, search }, pagination: { page, limit } })

    const response = {
      data: rfis,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache the response
    cache.set(cacheKey, response, 60)

    return createCachedResponse(response, { maxAge: 60 })
  } catch (error) {
    console.error('GET RFIs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    timer.end()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      title,
      description,
      suggestedSolution,
      priority = Priority.MEDIUM,
      urgency = RFIUrgency.NORMAL,
      direction = RFIDirection.OUTGOING,
      dateNeededBy,
      clientId,
      projectId,
    } = await request.json()

    // Validate required fields
    if (!title || !description || !clientId || !projectId) {
      return NextResponse.json(
        { error: 'Title, description, client, and project are required' },
        { status: 400 }
      )
    }

    // Validate enums
    if (!Object.values(Priority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }


    if (!Object.values(RFIUrgency).includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency' },
        { status: 400 }
      )
    }

    // Verify client and project exist
    const [client, project] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.project.findUnique({ 
        where: { id: projectId },
        select: { id: true, projectNumber: true }
      }),
    ])

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!project.projectNumber) {
      return NextResponse.json(
        { error: 'Project must have a project number to create RFIs' },
        { status: 400 }
      )
    }

    // Find the last RFI for this specific project
    const lastProjectRFI = await prisma.rFI.findFirst({
      where: { projectId },
      orderBy: { rfiNumber: 'desc' },
      select: { rfiNumber: true },
    })

    let rfiNumber: string
    if (lastProjectRFI) {
      // Extract the sequence number from the existing RFI number (e.g., "316402-5" -> 5)
      const parts = lastProjectRFI.rfiNumber.split('-')
      if (parts.length >= 2 && parts[0] === project.projectNumber) {
        const lastSequence = parseInt(parts[1])
        rfiNumber = `${project.projectNumber}-${lastSequence + 1}`
      } else {
        // Fallback: start from 1 if format doesn't match
        rfiNumber = `${project.projectNumber}-1`
      }
    } else {
      // First RFI for this project
      rfiNumber = `${project.projectNumber}-1`
    }

    // Create RFI
    const rfi = await prisma.rFI.create({
      data: {
        rfiNumber,
        title,
        description,
        suggestedSolution,
        priority,
        urgency,
        direction,
        dateNeededBy: dateNeededBy ? new Date(dateNeededBy) : null,
        clientId,
        projectId,
        createdById: user.id,
        dateSent: direction === RFIDirection.OUTGOING ? new Date() : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        responses: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            size: true,
            mimeType: true,
            createdAt: true,
          },
        },
        _count: {
          select: { 
            responses: true,
            attachments: true,
          },
        },
      },
    })

    // Invalidate RFI caches when creating new RFI
    cache.invalidatePattern(`rfis:.*`)

    return NextResponse.json(rfi, { status: 201 })
  } catch (error) {
    console.error('POST RFI error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}