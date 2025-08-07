import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admins to debug
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: clientId } = await params

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        active: true,
        deletedAt: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get ALL contacts for this client
    const allContacts = await prisma.contact.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        deletedAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Get the dependency counts as the DELETE endpoint would see them
    const clientWithCounts = await prisma.client.findUnique({
      where: { id: clientId },
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
            contacts: {
              where: {
                deletedAt: null, // Only count non-deleted contacts
              },
            },
          },
        },
      },
    })

    // Get contacts that are blocking deletion
    const blockingContacts = await prisma.contact.findMany({
      where: {
        clientId,
        deletedAt: null // These are the ones preventing deletion
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        deletedAt: true,
        updatedAt: true
      }
    })

    // Check project stakeholder relationships
    const stakeholders = await prisma.projectStakeholder.findMany({
      where: {
        contact: {
          clientId
        }
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            deletedAt: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            deletedAt: true
          }
        }
      }
    })

    return NextResponse.json({
      client,
      allContacts,
      dependencyCounts: clientWithCounts?._count,
      blockingContacts,
      stakeholders,
      summary: {
        totalContacts: allContacts.length,
        activeContacts: allContacts.filter(c => c.active && !c.deletedAt).length,
        inactiveContacts: allContacts.filter(c => !c.active && !c.deletedAt).length,
        softDeletedContacts: allContacts.filter(c => c.deletedAt).length,
        contactsBlockingDeletion: blockingContacts.length,
        canDelete: clientWithCounts?._count.contacts === 0 && 
                   clientWithCounts?._count.projects === 0 && 
                   clientWithCounts?._count.rfis === 0
      }
    })

  } catch (error) {
    console.error('Debug client contacts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}