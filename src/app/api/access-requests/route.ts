import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view access requests
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessRequests = await prisma.accessRequest.findMany({
      include: {
        contact: {
          include: {
            client: true,
            projectStakeholders: {
              where: {
                projectId: {
                  // This will be filtered per request below
                }
              }
            }
          }
        },
        project: true,
        processedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' }
      ]
    })

    // Add current access status to each request
    const enrichedRequests = await Promise.all(
      accessRequests.map(async (request) => {
        // Check if contact currently has stakeholder access to this project
        const currentStakeholder = await prisma.projectStakeholder.findUnique({
          where: {
            projectId_contactId: {
              projectId: request.projectId,
              contactId: request.contactId
            }
          }
        })

        return {
          ...request,
          currentlyHasAccess: !!currentStakeholder
        }
      })
    )

    return NextResponse.json(enrichedRequests)
  } catch (error) {
    console.error('Failed to fetch access requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch access requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactId, projectId, requestedRole, justification } = body

    // Validate required fields
    if (!contactId || !projectId || !requestedRole) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        projectStakeholders: {
          where: { projectId }
        }
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Check if already a stakeholder
    if (contact.projectStakeholders.length > 0) {
      return NextResponse.json(
        { error: 'Already a stakeholder for this project' },
        { status: 400 }
      )
    }

    // Check for existing pending request
    const existingRequest = await prisma.accessRequest.findFirst({
      where: {
        contactId,
        projectId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A pending request already exists' },
        { status: 400 }
      )
    }

    // Check for domain-based auto-approval
    let autoApprovalReason = null
    const contactDomain = contact.email.split('@')[1]
    
    // Get existing stakeholders for the project to check domains
    const projectStakeholders = await prisma.projectStakeholder.findMany({
      where: { projectId },
      include: {
        contact: true
      }
    })

    const stakeholderDomains = projectStakeholders
      .map(ps => ps.contact.email.split('@')[1])
      .filter((domain, index, self) => self.indexOf(domain) === index)

    if (stakeholderDomains.includes(contactDomain)) {
      autoApprovalReason = `Email domain matches existing stakeholder (${contactDomain})`
    }

    // Create the access request
    const accessRequest = await prisma.accessRequest.create({
      data: {
        contactId,
        projectId,
        requestedRole,
        justification,
        autoApprovalReason,
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

    // If auto-approval is suggested, notify admins
    if (autoApprovalReason) {
      // TODO: Send notification email to admins
      console.log('Auto-approval suggested for access request:', accessRequest.id)
    }

    return NextResponse.json(accessRequest, { status: 201 })
  } catch (error) {
    console.error('Failed to create access request:', error)
    return NextResponse.json(
      { error: 'Failed to create access request' },
      { status: 500 }
    )
  }
}