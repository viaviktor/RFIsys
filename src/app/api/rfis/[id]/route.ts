import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { RFIStatus, Priority, RFIDirection, RFIUrgency, Role } from '@prisma/client'
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
    const rfi = await prisma.rFI.findUnique({
      where: { id },
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
          orderBy: { createdAt: 'asc' },
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

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    return NextResponse.json(rfi)
  } catch (error) {
    console.error('GET RFI error:', error)
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
      title,
      description,
      suggestedSolution,
      status,
      priority,
      urgency,
      direction,
      dateNeededBy,
      dueDate,
      clientId,
      projectId,
    } = await request.json()

    const { id } = await params
    // Find existing RFI
    const existingRFI = await prisma.rFI.findUnique({
      where: { id },
    })

    if (!existingRFI) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Check permissions
    const canEdit = 
      user.id === existingRFI.createdById || // Creator can edit
      user.role === Role.MANAGER || // Managers can edit any
      user.role === Role.ADMIN // Admins can edit any

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate enums if provided
    if (status && !Object.values(RFIStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    if (priority && !Object.values(Priority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }


    if (urgency && !Object.values(RFIUrgency).includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency' },
        { status: 400 }
      )
    }

    if (direction && !Object.values(RFIDirection).includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid direction' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (suggestedSolution !== undefined) updateData.suggestedSolution = suggestedSolution
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (urgency !== undefined) updateData.urgency = urgency
    if (direction !== undefined) updateData.direction = direction
    if (clientId !== undefined) updateData.clientId = clientId
    if (projectId !== undefined) updateData.projectId = projectId
    if (dateNeededBy !== undefined) {
      updateData.dateNeededBy = dateNeededBy ? new Date(dateNeededBy) : null
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    // Update RFI
    const updatedRFI = await prisma.rFI.update({
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
          orderBy: { createdAt: 'asc' },
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

    return NextResponse.json(updatedRFI)
  } catch (error) {
    console.error('PUT RFI error:', error)
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

    const { id } = await params
    
    // Get RFI with all related data that needs to be cleaned up
    const rfi = await prisma.rFI.findUnique({
      where: { id },
      include: {
        attachments: true,
        responses: true,
        emailLogs: true,
      },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Check permissions - only admins can delete
    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Only admins can delete RFIs' },
        { status: 403 }
      )
    }

    console.log(`🗑️ Starting complete deletion of RFI ${rfi.rfiNumber} with ${rfi.attachments.length} attachments`)

    // Delete all attachment files from filesystem
    for (const attachment of rfi.attachments) {
      try {
        const filePath = join(UPLOAD_DIR, attachment.storedName)
        await unlink(filePath)
        console.log(`📎 Deleted attachment file: ${attachment.filename}`)
      } catch (fileError) {
        console.warn(`⚠️ Could not delete attachment file ${attachment.filename}:`, fileError)
      }
    }

    // Use a transaction to delete everything in the correct order
    await prisma.$transaction(async (tx) => {
      // Delete email logs first (no foreign key constraints)
      if (rfi.emailLogs.length > 0) {
        await tx.emailLog.deleteMany({
          where: { rfiId: id },
        })
      }

      // Delete attachments
      if (rfi.attachments.length > 0) {
        await tx.attachment.deleteMany({
          where: { rfiId: id },
        })
      }

      // Delete responses
      if (rfi.responses.length > 0) {
        await tx.response.deleteMany({
          where: { rfiId: id },
        })
      }

      // Finally delete the RFI
      await tx.rFI.delete({
        where: { id },
      })
    })

    console.log(`✅ Successfully deleted RFI ${rfi.rfiNumber} and all related data`)

    return NextResponse.json({ 
      message: 'RFI and all related data deleted successfully',
      deletedCounts: {
        attachments: rfi.attachments.length,
        responses: rfi.responses.length,
        emailLogs: rfi.emailLogs.length,
      }
    })
  } catch (error) {
    console.error('DELETE RFI error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}