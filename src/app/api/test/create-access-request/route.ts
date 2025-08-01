import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available' }, { status: 404 })
    }

    // Find a contact and project to create a test request
    const contact = await prisma.contact.findFirst({
      where: {
        password: null // Not yet registered
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'No unregistered contact found' }, { status: 404 })
    }

    const project = await prisma.project.findFirst({
      where: {
        active: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'No active project found' }, { status: 404 })
    }

    // Check if request already exists
    const existing = await prisma.accessRequest.findFirst({
      where: {
        contactId: contact.id,
        projectId: project.id,
        status: 'PENDING'
      }
    })

    if (existing) {
      return NextResponse.json({ 
        message: 'Access request already exists',
        accessRequest: existing 
      })
    }

    // Create test access request
    const accessRequest = await prisma.accessRequest.create({
      data: {
        contactId: contact.id,
        projectId: project.id,
        requestedRole: 'STAKEHOLDER_L1',
        justification: 'I need access to respond to RFIs for this project',
        status: 'PENDING'
      },
      include: {
        contact: {
          include: {
            client: true
          }
        },
        project: true
      }
    })

    return NextResponse.json({
      message: 'Test access request created',
      accessRequest
    })
  } catch (error) {
    console.error('Failed to create test access request:', error)
    return NextResponse.json(
      { error: 'Failed to create test access request' },
      { status: 500 }
    )
  }
}