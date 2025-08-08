import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { RFIStatus, Priority, RFIDirection, RFIUrgency, Role } from '@prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { canViewRFI } from '@/lib/permissions'
import { markAsDeleted } from '@/lib/soft-delete'
import { hardDeleteRFI } from '@/lib/hard-delete'

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
    
    // Check if user has permission to view this RFI
    const canView = await canViewRFI(user, id)
    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const rfi = await prisma.rFI.findFirst({
      where: { 
        id,
        deletedAt: null // Only non-deleted RFIs
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
    
    // Check if RFI exists (including soft-deleted ones for hard delete)
    const rfi = await prisma.rFI.findUnique({
      where: { id },
      select: {
        id: true,
        rfiNumber: true,
        title: true,
        createdById: true,
        project: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            attachments: true,
            responses: true,
          }
        }
      }
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Check permissions - admins, managers, or RFI creator can delete
    if (user.role !== Role.ADMIN && user.role !== Role.MANAGER && user.id !== rfi.createdById) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this RFI' },
        { status: 403 }
      )
    }

    console.log(`🗑️ ${user.name} requesting HARD DELETE of RFI: ${rfi.rfiNumber} - ${rfi.title}`)
    console.log(`📊 RFI contains: ${rfi._count.attachments} attachments, ${rfi._count.responses} responses`)

    // HARD DELETE - completely remove RFI and all associated data
    const result = await hardDeleteRFI(id)

    console.log(`✅ Successfully HARD DELETED RFI: ${rfi.rfiNumber}`)
    console.log(`📁 Deleted ${result.deletedFiles.length} files`)
    console.log(`📊 Deleted records:`, result.deletedRecords)

    if (result.fileErrors.length > 0) {
      console.warn(`⚠️ File deletion errors:`, result.fileErrors)
    }

    return NextResponse.json({ 
      success: true,
      message: `RFI "${rfi.rfiNumber}" and all associated data permanently deleted`,
      summary: {
        rfiNumber: rfi.rfiNumber,
        title: rfi.title,
        project: rfi.project.name,
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
    console.error('DELETE RFI error:', error)
    
    // Handle specific error cases
    if (error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete RFI due to database constraints. Please contact support.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}