import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getUserClients } from '@/lib/permissions'
import { createActiveAndDeleteFilter } from '@/lib/soft-delete'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Filters
    const search = searchParams.get('search')
    const active = searchParams.get('active')

    // For stakeholders, get clients based on their project access
    if (user.userType === 'stakeholder' && user.projectAccess) {
      // Get unique client IDs from user's projects
      const projects = await prisma.project.findMany({
        where: { id: { in: user.projectAccess } },
        select: { clientId: true }
      })
      
      const clientIds = [...new Set(projects.map(p => p.clientId))]
      
      // Build where clause for stakeholders (with soft delete support)
      const where: any = { 
        id: { in: clientIds },
        ...createActiveAndDeleteFilter(active === 'true' ? true : active === 'false' ? false : undefined)
      }

      if (search) {
        where.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          }
        ]
      }

      // Get filtered clients
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                status: true,
              },
              where: { 
                active: true,
                id: { in: user.projectAccess } // Only show projects they have access to
              },
            },
            _count: {
              select: {
                projects: {
                  where: { 
                    id: { in: user.projectAccess },
                    deletedAt: null // Only count non-deleted projects
                  }
                },
                rfis: {
                  where: { 
                    projectId: { in: user.projectAccess },
                    deletedAt: null // Only count non-deleted RFIs
                  }
                },
              }
            }
          },
          orderBy: { name: 'asc' },
          skip: offset,
          take: limit,
        }),
        prisma.client.count({ where }),
      ])

      return NextResponse.json({
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      })
    }

    // For internal users, show all clients (with soft delete filtering)
    const where: any = createActiveAndDeleteFilter(
      active === 'true' ? true : active === 'false' ? false : undefined
    )

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get clients with pagination
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
            },
            where: { active: true },
          },
          rfis: {
            where: {
              deletedAt: null, // Only fetch non-deleted RFIs
            },
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              projects: {
                where: {
                  deletedAt: null, // Only count non-deleted projects
                },
              },
              rfis: {
                where: {
                  deletedAt: null, // Only count non-deleted RFIs
                },
              },
              contacts: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country = 'USA',
      notes,
    } = await request.json()

    // Validate required fields
    if (!name || !contactName || !email) {
      return NextResponse.json(
        { error: 'Name, contact name, and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if client with same email already exists (excluding soft-deleted)
    const existingClient = await prisma.client.findFirst({
      where: { 
        email,
        deletedAt: null // Only check non-deleted clients
      },
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Client with this email already exists' },
        { status: 409 }
      )
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        notes,
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: true,
            rfis: true,
            contacts: true,
          },
        },
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('POST client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}