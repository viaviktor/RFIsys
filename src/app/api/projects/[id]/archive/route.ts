import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only managers and admins can archive projects
    if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Only managers and admins can archive projects' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Find existing project
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rfis: true,
          },
        },
      },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user can archive this specific project
    const canArchive = 
      user.id === existingProject.managerId || // Project manager can archive
      user.role === Role.MANAGER || // Managers can archive any
      user.role === Role.ADMIN // Admins can archive any

    if (!canArchive) {
      return NextResponse.json(
        { error: 'Insufficient permissions to archive this project' },
        { status: 403 }
      )
    }

    // Archive the project
    const archivedProject = await prisma.project.update({
      where: { id },
      data: { 
        status: 'ARCHIVED',
        active: false,
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
            stakeholders: true,
          },
        },
      },
    })

    console.log(`📦 Project ${archivedProject.name} archived by ${user.name}`)

    return NextResponse.json({
      message: 'Project archived successfully',
      project: archivedProject,
    })
  } catch (error) {
    console.error('Archive project error:', error)
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

    // Check permissions - only managers and admins can unarchive projects
    if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Only managers and admins can unarchive projects' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Find existing project
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (existingProject.status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Project is not archived' },
        { status: 400 }
      )
    }

    // Check if user can unarchive this specific project
    const canUnarchive = 
      user.id === existingProject.managerId || // Project manager can unarchive
      user.role === Role.MANAGER || // Managers can unarchive any
      user.role === Role.ADMIN // Admins can unarchive any

    if (!canUnarchive) {
      return NextResponse.json(
        { error: 'Insufficient permissions to unarchive this project' },
        { status: 403 }
      )
    }

    // Unarchive the project (restore to ACTIVE)
    const unarchivedProject = await prisma.project.update({
      where: { id },
      data: { 
        status: 'ACTIVE',
        active: true,
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
            stakeholders: true,
          },
        },
      },
    })

    console.log(`📤 Project ${unarchivedProject.name} unarchived by ${user.name}`)

    return NextResponse.json({
      message: 'Project unarchived successfully',
      project: unarchivedProject,
    })
  } catch (error) {
    console.error('Unarchive project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}