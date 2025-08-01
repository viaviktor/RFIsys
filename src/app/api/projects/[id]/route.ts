import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
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
    
    const project = await prisma.project.findUnique({
      where: { id },
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
            rfis: true,
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
            rfis: true,
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
    
    // Get project with all related data that needs to be cleaned up
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        rfis: {
          include: {
            attachments: true,
            responses: true,
            emailLogs: true,
          },
        },
        stakeholders: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log(`🗑️ Starting complete deletion of project ${project.name} with ${project.rfis.length} RFIs`)

    // Delete all attachment files from filesystem
    for (const rfi of project.rfis) {
      for (const attachment of rfi.attachments) {
        try {
          const filePath = join(UPLOAD_DIR, attachment.storedName)
          await unlink(filePath)
          console.log(`📎 Deleted attachment file: ${attachment.filename}`)
        } catch (fileError) {
          console.warn(`⚠️ Could not delete attachment file ${attachment.filename}:`, fileError)
        }
      }
    }

    // Use a transaction to delete everything in the correct order
    await prisma.$transaction(async (tx) => {
      // Delete email logs first (no foreign key constraints)
      for (const rfi of project.rfis) {
        if (rfi.emailLogs.length > 0) {
          await tx.emailLog.deleteMany({
            where: { rfiId: rfi.id },
          })
        }
      }

      // Delete attachments
      for (const rfi of project.rfis) {
        if (rfi.attachments.length > 0) {
          await tx.attachment.deleteMany({
            where: { rfiId: rfi.id },
          })
        }
      }

      // Delete responses
      for (const rfi of project.rfis) {
        if (rfi.responses.length > 0) {
          await tx.response.deleteMany({
            where: { rfiId: rfi.id },
          })
        }
      }

      // Delete RFIs
      if (project.rfis.length > 0) {
        await tx.rFI.deleteMany({
          where: { projectId: id },
        })
      }

      // Delete project stakeholders
      if (project.stakeholders.length > 0) {
        await tx.projectStakeholder.deleteMany({
          where: { projectId: id },
        })
      }

      // Finally delete the project
      await tx.project.delete({
        where: { id },
      })
    })

    console.log(`✅ Successfully deleted project ${project.name} and all related data`)

    return NextResponse.json({ 
      message: 'Project and all related data deleted successfully',
      deletedCounts: {
        rfis: project.rfis.length,
        attachments: project.rfis.reduce((sum, rfi) => sum + rfi.attachments.length, 0),
        responses: project.rfis.reduce((sum, rfi) => sum + rfi.responses.length, 0),
        emailLogs: project.rfis.reduce((sum, rfi) => sum + rfi.emailLogs.length, 0),
        stakeholders: project.stakeholders.length,
      }
    })
  } catch (error) {
    console.error('DELETE project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}