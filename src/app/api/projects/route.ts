import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { applyProjectFilter } from '@/lib/permissions'

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
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const managerId = searchParams.get('managerId')
    const active = searchParams.get('active')

    // Build where clause
    const where: any = {}
    
    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (managerId) where.managerId = managerId
    if (active !== null) where.active = active === 'true'

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Apply project-based filtering for stakeholders
    const whereFilter = user.userType === 'stakeholder' && user.projectAccess
      ? { ...where, id: { in: user.projectAccess } }
      : where

    // Get projects with pagination
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereFilter,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactName: true,
              email: true,
            },
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              rfis: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.project.count({ where: whereFilter }),
    ])

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET projects error:', error)
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
      description,
      projectNumber,
      clientId,
      managerId,
      startDate,
      endDate,
      status = 'ACTIVE',
      notes,
    } = await request.json()

    // Validate required fields
    if (!name || !clientId) {
      return NextResponse.json(
        { error: 'Name and client are required' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Verify manager exists if provided
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      })

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        )
      }
    }

    // Check if project number is unique if provided
    if (projectNumber) {
      const existingProject = await prisma.project.findUnique({
        where: { projectNumber },
      })

      if (existingProject) {
        return NextResponse.json(
          { error: 'Project number already exists' },
          { status: 409 }
        )
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        projectNumber,
        clientId,
        managerId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
          notes,
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
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            rfis: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('POST project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}