import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { z } from 'zod'
import { createRegistrationToken, generateRegistrationUrl } from '@/lib/registration-tokens'
import { sendEmail } from '@/lib/email'
import { appConfig } from '@/lib/env'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  projectId: z.string().uuid(),
  message: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Currently only internal users can send invitations due to schema constraints
    if (user.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Only internal users can send invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = inviteSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.issues },
        { status: 400 }
      )
    }

    const { email, name, projectId, message } = result.data

    // Internal users have access to all projects, no need to check

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if contact already exists
    let contact = await prisma.contact.findFirst({
      where: { email }
    })

    if (!contact) {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          email,
          name,
          clientId: project.clientId,
          registrationEligible: true
        }
      })
    }

    // Check if already a stakeholder on this project
    const existingStakeholder = await prisma.projectStakeholder.findUnique({
      where: {
        projectId_contactId: {
          projectId,
          contactId: contact.id
        }
      }
    })

    if (existingStakeholder) {
      return NextResponse.json(
        { error: 'This person is already a stakeholder on this project' },
        { status: 400 }
      )
    }

    // Add as L2 stakeholder
    await prisma.projectStakeholder.create({
      data: {
        projectId,
        contactId: contact.id,
        stakeholderLevel: 2,
        addedById: user.id // Always an internal user due to check above
      }
    })

    // Create registration token if contact hasn't registered yet
    let registrationUrl: string | null = null
    if (!contact.password) {
      const token = await createRegistrationToken({
        email: contact.email,
        contactId: contact.id,
        projectIds: [projectId],
        tokenType: 'AUTO_APPROVED',
        expiresInDays: 30
      })
      registrationUrl = await generateRegistrationUrl(token.token)
    }

    // Send invitation email
    const emailSubject = `You've been invited to collaborate on ${project.name}`
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #10b981; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold;
            margin: 20px 0;
          }
          .message-box { 
            background: #f3f4f6; 
            padding: 15px; 
            border-left: 4px solid #10b981; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>You've been invited to collaborate!</h2>
          </div>
          
          <p>Hi ${name},</p>
          
          <p>${user.name} has invited you to collaborate as a Level 2 stakeholder on the project:</p>
          
          <h3>${project.name}</h3>
          <p><strong>Client:</strong> ${project.client.name}</p>
          
          ${message ? `
          <div class="message-box">
            <strong>Message from ${user.name}:</strong><br>
            ${message}
          </div>
          ` : ''}
          
          ${registrationUrl ? `
          <p>To get started, you'll need to create your account:</p>
          
          <a href="${registrationUrl}" class="button">Create Your Account</a>
          
          <p>This will give you access to:</p>
          <ul>
            <li>View and respond to RFIs for this project</li>
            <li>Collaborate with other project stakeholders</li>
            <li>Receive email notifications for project updates</li>
          </ul>
          ` : `
          <p>You already have an account. You can log in to access the project:</p>
          
          <a href="${appConfig.url}/login" class="button">Log In</a>
          `}
          
          <p>If you have any questions, please don't hesitate to reach out.</p>
          
          <p>Best regards,<br>
          ${user.name}<br>
          ${appConfig.name}</p>
        </div>
      </body>
      </html>
    `

    const emailText = `
You've been invited to collaborate!

Hi ${name},

${user.name} has invited you to collaborate as a Level 2 stakeholder on the project:

${project.name}
Client: ${project.client.name}

${message ? `Message from ${user.name}:\n${message}\n\n` : ''}

${registrationUrl ? `To get started, create your account:\n${registrationUrl}` : `You already have an account. Log in at: ${appConfig.url}/login`}

Best regards,
${user.name}
${appConfig.name}
    `.trim()

    await sendEmail({
      to: [email],
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        isRegistered: !!contact.password
      }
    })

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

// GET endpoint to list invitations sent by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Currently only internal users can view invitations
    if (user.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')

    // Build query conditions
    const where: any = {}
    
    // Internal users only - filter by who added them
    where.addedById = user.id

    if (projectId) {
      where.projectId = projectId
    }

    where.stakeholderLevel = 2 // Only show L2 invitations

    const invitations = await prisma.projectStakeholder.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            password: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      contact: {
        id: inv.contact.id,
        name: inv.contact.name,
        email: inv.contact.email,
        isRegistered: !!inv.contact.password
      },
      project: inv.project,
      invitedAt: inv.createdAt
    }))

    return NextResponse.json({
      invitations: formattedInvitations,
      total: formattedInvitations.length
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}