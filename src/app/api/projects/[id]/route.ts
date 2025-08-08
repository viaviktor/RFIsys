import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { markAsDeleted } from '@/lib/soft-delete'
import { hardDeleteProject } from '@/lib/hard-delete'
import { Role } from '@prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { globalEvents, EVENTS } from '@/lib/events'

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
    // Find existing project (excluding soft-deleted)
    const existingProject = await prisma.project.findFirst({
      where: { 
        id,
        deletedAt: null // Only check non-deleted projects
      },
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

    // Verify client exists if being changed (excluding soft-deleted)
    if (clientId && clientId !== existingProject.clientId) {
      const client = await prisma.client.findFirst({
        where: { 
          id: clientId,
          deletedAt: null // Only check non-deleted clients
        },
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
    }

    // Verify manager exists if being changed (excluding soft-deleted)
    if (managerId && managerId !== existingProject.managerId) {
      const manager = await prisma.user.findFirst({
        where: { 
          id: managerId,
          deletedAt: null // Only check non-deleted users
        },
      })

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        )
      }
    }

    // Check project number uniqueness if being changed (excluding soft-deleted)
    if (projectNumber && projectNumber !== existingProject.projectNumber) {
      const projectNumberConflict = await prisma.project.findFirst({
        where: { 
          projectNumber: projectNumber.toString(), // Ensure string comparison
          id: { not: id },
          deletedAt: null // Only check non-deleted projects
        },
        select: { id: true, projectNumber: true, name: true }
      })

      if (projectNumberConflict) {
        return NextResponse.json(
          { 
            error: 'Project number already exists',
            conflictingProject: projectNumberConflict.name 
          },
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
  } catch (error: any) {
    console.error('PUT project error:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'unknown field'
      console.error('Unique constraint failed on:', field)
      return NextResponse.json(
        { error: `Value already exists for ${field}` },
        { status: 409 }
      )
    }
    
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
    
    // Check if project exists (including soft-deleted ones for hard delete)
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        _count: {
          select: {
            rfis: true, // Count ALL RFIs for info
            stakeholders: true,
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log(`🗑️ Admin ${user.name} requesting HARD DELETE of project: ${project.name}`)
    console.log(`📊 Project contains: ${project._count.rfis} RFIs, ${project._count.stakeholders} stakeholders`)

    // HARD DELETE - completely remove project and all associated data
    const result = await hardDeleteProject(id)

    console.log(`✅ Successfully HARD DELETED project: ${result.projectName}`)
    console.log(`📁 Deleted ${result.deletedFiles.length} files`)
    console.log(`📊 Deleted records:`, result.deletedRecords)

    if (result.fileErrors.length > 0) {
      console.warn(`⚠️ File deletion errors:`, result.fileErrors)
    }

    // Emit project deletion event for cache invalidation
    globalEvents.emit(EVENTS.PROJECT_DELETED, id)

    return NextResponse.json({ 
      success: true,
      message: `Project "${result.projectName}" and all associated data permanently deleted`,
      summary: {
        projectName: result.projectName,
        projectNumber: project.projectNumber,
        deletedFiles: result.deletedFiles.length,
        fileErrors: result.fileErrors.length,
        deletedRecords: result.deletedRecords
      },
      details: {
        deletedFiles: result.deletedFiles,
        fileErrors: result.fileErrors
      }
    })
  } catch (error: any) {
    console.error('DELETE project error:', error)
    
    // Handle specific error cases
    if (error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete project due to database constraints. Please contact support.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}