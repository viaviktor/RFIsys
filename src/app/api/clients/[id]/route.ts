import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { canViewClient } from '@/lib/permissions'
import { markAsDeleted } from '@/lib/soft-delete'
import { Role } from '@prisma/client'
import { globalEvents, EVENTS } from '@/lib/events'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Check if user has access to this client
    const hasAccess = await canViewClient(user, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const client = await prisma.client.findFirst({
      where: { 
        id,
        deletedAt: null // Only non-deleted clients
      },
      include: {
        projects: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                rfis: {
                  where: {
                    deletedAt: null, // Only count non-deleted RFIs
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        rfis: {
          where: {
            deletedAt: null, // Only fetch non-deleted RFIs
          },
          include: {
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 RFIs
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
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('GET client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - managers and admins can edit clients
    if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
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
      country,
      notes,
      active,
    } = await request.json()

    const { id } = await params
    // Find existing client
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // If email is being changed, check for conflicts
    if (email && email !== existingClient.email) {
      const emailConflict = await prisma.client.findFirst({
        where: { 
          email,
          id: { not: id },
        },
      })

      if (emailConflict) {
        return NextResponse.json(
          { error: 'Client with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (contactName !== undefined) updateData.contactName = contactName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zipCode !== undefined) updateData.zipCode = zipCode
    if (country !== undefined) updateData.country = country
    if (notes !== undefined) updateData.notes = notes
    if (active !== undefined) updateData.active = active

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('PUT client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only admins can delete clients
    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Only admins can delete clients' },
        { status: 403 }
      )
    }

    const { id } = await params
    // Find existing client (exclude already soft-deleted)
    const existingClient = await prisma.client.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      include: {
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
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check for dependencies that prevent deletion
    const dependencies = []
    if (existingClient._count.projects > 0) {
      dependencies.push(`${existingClient._count.projects} project(s)`)
    }
    if (existingClient._count.rfis > 0) {
      dependencies.push(`${existingClient._count.rfis} RFI(s)`)
    }
    if (existingClient._count.contacts > 0) {
      dependencies.push(`${existingClient._count.contacts} contact(s)`)
    }

    if (dependencies.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete client with dependencies',
        message: `This client has ${dependencies.join(', ')}. Please delete or reassign these items first.`,
        dependencies: {
          projects: existingClient._count.projects,
          rfis: existingClient._count.rfis,
          contacts: existingClient._count.contacts,
        }
      }, { status: 409 })
    }

    // Soft delete client - preserve all data integrity
    const deletedClient = await prisma.client.update({
      where: { id },
      data: {
        ...markAsDeleted(),
        active: false, // Also deactivate for immediate effect
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
        active: true,
      }
    })

    // Emit client deletion event for cache invalidation
    globalEvents.emit(EVENTS.CLIENT_DELETED, deletedClient.id)

    return NextResponse.json({ 
      data: deletedClient,
      message: 'Client deleted successfully'
    })
  } catch (error) {
    console.error('DELETE client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}