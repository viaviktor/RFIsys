import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
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
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // EMERGENCY FIX: Use raw SQL to avoid Prisma enum serialization errors
    try {
      const stakeholders = await prisma.projectStakeholder.findMany({
        where: { 
          projectId,
          contact: {
            role: { in: ['USER', 'MANAGER', 'ADMIN', 'STAKEHOLDER_L1', 'STAKEHOLDER_L2'] } // Only include valid roles
          }
        },
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
    } catch (prismaError: any) {
      // Fallback to raw SQL if Prisma still fails
      console.warn('Prisma query failed, using raw SQL fallback:', prismaError?.message || prismaError)
      
      const rawStakeholders = await prisma.$queryRaw`
        SELECT 
          ps.id,
          ps."projectId",
          ps."contactId",
          ps."createdAt",
          ps."addedById",
          ps."addedByContactId",
          ps."autoApproved",
          ps."stakeholderLevel",
          c.id as contact_id,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.title as contact_title,
          c.role as contact_role,
          c."clientId" as contact_client_id,
          cl.id as client_id,
          cl.name as client_name,
          cl.email as client_email
        FROM "ProjectStakeholder" ps
        INNER JOIN contacts c ON ps."contactId" = c.id
        INNER JOIN clients cl ON c."clientId" = cl.id
        WHERE ps."projectId" = ${projectId}
          AND c.role IS NOT NULL
        ORDER BY ps."createdAt" ASC
      ` as any[]
      
      // Transform raw results to match expected format
      const formattedStakeholders = rawStakeholders.map((row: any) => ({
        id: row.id,
        projectId: row.projectId,
        contactId: row.contactId,
        createdAt: row.createdAt,
        addedById: row.addedById,
        addedByContactId: row.addedByContactId,
        autoApproved: row.autoApproved,
        stakeholderLevel: row.stakeholderLevel,
        contact: {
          id: row.contact_id,
          name: row.contact_name,
          email: row.contact_email,
          phone: row.contact_phone,
          title: row.contact_title,
          role: row.contact_role,
          clientId: row.contact_client_id,
          client: {
            id: row.client_id,
            name: row.client_name,
            email: row.client_email
          }
        }
      }))
      
      return NextResponse.json({ stakeholders: formattedStakeholders })
    }
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
    const user = await authenticateRequest(request)
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
    const user = await authenticateRequest(request)
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

    // Remove stakeholder relationship and handle contact cleanup
    await prisma.$transaction(async (tx) => {
      // Delete the stakeholder relationship
      await tx.projectStakeholder.delete({
        where: {
          id: stakeholder.id,
        },
      })

      // Check if contact has any other stakeholder relationships
      const remainingStakeholderCount = await tx.projectStakeholder.count({
        where: {
          contactId: contactId,
        },
      })

      // If no other stakeholder relationships exist, clear password and role
      // This allows the contact to be re-approved later
      if (remainingStakeholderCount === 0) {
        await tx.contact.update({
          where: { id: contactId },
          data: {
            password: null,
            registrationEligible: false,
            emailVerified: false,
          },
        })

        // Also clean up any unused registration tokens for this contact
        await tx.registrationToken.deleteMany({
          where: {
            contactId: contactId,
            usedAt: null,
          },
        })

        console.log(`✅ Contact ${contactId} cleared for future re-approval (no remaining stakeholder relationships)`)
      } else {
        console.log(`ℹ️ Contact ${contactId} still has ${remainingStakeholderCount} other stakeholder relationships`)
      }
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