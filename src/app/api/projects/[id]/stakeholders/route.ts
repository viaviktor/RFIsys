import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const addStakeholderSchema = z.object({
  contactId: z.string().cuid(),
})

const removeStakeholderSchema = z.object({
  contactId: z.string().cuid(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    const stakeholders = await prisma.projectStakeholder.findMany({
      where: { projectId },
      include: {
        contact: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ stakeholders })
  } catch (error) {
    console.error('Error fetching project stakeholders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stakeholders' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { contactId } = addStakeholderSchema.parse(body)

    // Check if project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if contact belongs to the same client as the project
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact || contact.clientId !== project.clientId) {
      return NextResponse.json(
        { error: 'Contact not found or does not belong to project client' },
        { status: 400 }
      )
    }

    // Check if stakeholder relationship already exists
    const existingStakeholder = await prisma.projectStakeholder.findUnique({
      where: {
        projectId_contactId: {
          projectId,
          contactId,
        },
      },
    })

    if (existingStakeholder) {
      return NextResponse.json(
        { error: 'Contact is already a stakeholder for this project' },
        { status: 400 }
      )
    }

    // Create stakeholder relationship
    const stakeholder = await prisma.projectStakeholder.create({
      data: {
        projectId,
        contactId,
        stakeholderLevel: 1,
        addedById: user.id // Must be an internal user to add stakeholders
      },
      include: {
        contact: {
          include: {
            client: true,
          },
        },
      },
    })

    return NextResponse.json({ stakeholder }, { status: 201 })
  } catch (error) {
    console.error('Error adding project stakeholder:', error)
    return NextResponse.json(
      { error: 'Failed to add stakeholder' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId query parameter is required' },
        { status: 400 }
      )
    }

    // Check if stakeholder relationship exists
    const stakeholder = await prisma.projectStakeholder.findUnique({
      where: {
        projectId_contactId: {
          projectId,
          contactId,
        },
      },
    })

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder relationship not found' },
        { status: 404 }
      )
    }

    // Remove stakeholder relationship
    await prisma.projectStakeholder.delete({
      where: {
        id: stakeholder.id,
      },
    })

    return NextResponse.json({ message: 'Stakeholder removed successfully' })
  } catch (error) {
    console.error('Error removing project stakeholder:', error)
    return NextResponse.json(
      { error: 'Failed to remove stakeholder' },
      { status: 500 }
    )
  }
}