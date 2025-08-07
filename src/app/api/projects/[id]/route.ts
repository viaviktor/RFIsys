import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { markAsDeleted } from '@/lib/soft-delete'
import { Role } from '@prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

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
    
    // Check if stakeholder has access to this project
    if (user.userType === 'stakeholder' && !user.projectAccess?.includes(id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const project = await prisma.project.findFirst({
      where: { 
        id,
        deletedAt: null // Only non-deleted projects
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactName: true,
            email: true,
            phone: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        rfis: {
          where: {
            deletedAt: null, // Only fetch non-deleted RFIs
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                responses: true,
                attachments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20, // Latest 20 RFIs
        },
        stakeholders: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            rfis: {
              where: {
                deletedAt: null, // Only count non-deleted RFIs
              },
            },
            stakeholders: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('GET project error:', error)
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

    const {
      name,
      description,
      projectNumber,
      clientId,
      managerId,
      startDate,
      endDate,
      status,
      notes,
      active,
    } = await request.json()

    const { id } = await params
    // Find existing project
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check permissions
    const canEdit = 
      user.id === existingProject.managerId || // Project manager can edit
      user.role === Role.MANAGER || // Managers can edit any
      user.role === Role.ADMIN // Admins can edit any

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Verify client exists if being changed
    if (clientId && clientId !== existingProject.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
    }

    // Verify manager exists if being changed
    if (managerId && managerId !== existingProject.managerId) {
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

    // Check project number uniqueness if being changed
    if (projectNumber && projectNumber !== existingProject.projectNumber) {
      const projectNumberConflict = await prisma.project.findFirst({
        where: { 
          projectNumber,
          id: { not: id },
        },
      })

      if (projectNumberConflict) {
        return NextResponse.json(
          { error: 'Project number already exists' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (projectNumber !== undefined) updateData.projectNumber = projectNumber
    if (clientId !== undefined) updateData.clientId = clientId
    if (managerId !== undefined) updateData.managerId = managerId
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (active !== undefined) updateData.active = active

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
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
        stakeholders: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            rfis: {
              where: {
                deletedAt: null, // Only count non-deleted RFIs
              },
            },
            stakeholders: true,
          },
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('PUT project error:', error)
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

    // Check permissions - only admins can delete projects
    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Only admins can delete projects' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Check if project exists and is not already soft-deleted
    const project = await prisma.project.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            rfis: true,
            stakeholders: true,
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check for dependencies that prevent deletion
    const dependencies = []
    if (project._count.rfis > 0) {
      dependencies.push(`${project._count.rfis} RFI(s)`)
    }
    if (project._count.stakeholders > 0) {
      dependencies.push(`${project._count.stakeholders} stakeholder(s)`)
    }

    if (dependencies.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete project with dependencies',
        message: `This project has ${dependencies.join(', ')}. Please delete or reassign these items first.`,
        dependencies: {
          rfis: project._count.rfis,
          stakeholders: project._count.stakeholders,
        }
      }, { status: 409 })
    }

    // Soft delete project - preserve all data integrity
    const deletedProject = await prisma.project.update({
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

    console.log(`✅ Successfully soft-deleted project ${project.name}`)

    return NextResponse.json({ 
      data: deletedProject,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('DELETE project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}