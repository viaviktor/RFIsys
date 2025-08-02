import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const publicAccessRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  projectNumber: z.string().min(3, 'Please enter a valid project number'),
  reason: z.string().min(10, 'Please provide a reason for access (at least 10 characters)'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = publicAccessRequestSchema.parse(body)
    
    const { name, email, projectNumber, reason } = validatedData

    // Try to find the project by project number or name
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { projectNumber: { contains: projectNumber, mode: 'insensitive' } },
          { name: { contains: projectNumber, mode: 'insensitive' } }
        ]
      },
      include: {
        client: true
      }
    })

    let status = 'PENDING'
    let message = 'Access request submitted successfully!'
    let nextSteps = 'Your request has been sent to the project administrators. You will receive an email notification once your request is reviewed.'

    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'Project not found in our system.',
        nextSteps: 'Please verify the project number or contact an administrator for assistance. The project may not be set up in our system yet.'
      }, { status: 404 })
    }

    // Check if contact already exists
    let contact = await prisma.contact.findFirst({
      where: {
        email,
        clientId: project.clientId
      }
    })

    // Check for domain-based auto-approval
    let autoApprovalReason = null
    const requestDomain = email.split('@')[1]
    
    // Get existing stakeholders for the project to check domains
    const projectStakeholders = await prisma.projectStakeholder.findMany({
      where: { projectId: project.id },
      include: {
        contact: true
      }
    })

    const stakeholderDomains = projectStakeholders
      .map(ps => ps.contact.email.split('@')[1])
      .filter((domain, index, self) => self.indexOf(domain) === index)

    if (stakeholderDomains.includes(requestDomain)) {
      autoApprovalReason = `Email domain matches existing stakeholder (${requestDomain})`
      status = 'AUTO_APPROVED'
      message = 'Access request approved automatically!'
      nextSteps = 'Your email domain matches existing project stakeholders. An administrator will set up your account and send you login credentials.'
    }

    // If contact doesn't exist, create it
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name,
          email,
          clientId: project.clientId,
          registrationEligible: true,
          role: 'STAKEHOLDER_L1'
        }
      })
    }

    // Check if already a stakeholder
    const existingStakeholder = await prisma.projectStakeholder.findFirst({
      where: {
        contactId: contact.id,
        projectId: project.id
      }
    })

    if (existingStakeholder) {
      return NextResponse.json({
        success: false,
        message: 'You already have access to this project. Please try logging in instead.',
        nextSteps: 'If you forgot your password, please contact an administrator.'
      }, { status: 400 })
    }

    // Check for existing pending request
    const existingRequest = await prisma.accessRequest.findFirst({
      where: {
        contactId: contact.id,
        projectId: project.id,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        message: 'A request for this project is already pending review.',
        nextSteps: 'Please wait for an administrator to review your existing request.'
      }, { status: 400 })
    }

    // Create the access request
    const accessRequest = await prisma.accessRequest.create({
      data: {
        contactId: contact.id,
        projectId: project.id,
        requestedRole: 'STAKEHOLDER_L1',
        justification: reason,
        autoApprovalReason,
        status
      }
    })

    // If auto-approved, also create the stakeholder relationship
    if (status === 'AUTO_APPROVED') {
      await prisma.projectStakeholder.create({
        data: {
          projectId: project.id,
          contactId: contact.id,
          stakeholderLevel: 1,
          autoApproved: true,
          addedByContactId: contact.id // Self-added through auto-approval
        }
      })
    }

    return NextResponse.json({
      success: true,
      message,
      status,
      nextSteps
    })

  } catch (error) {
    console.error('Public access request error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Please check your form data.',
        details: error.issues.map(issue => issue.message).join(', ')
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    }, { status: 500 })
  }
}