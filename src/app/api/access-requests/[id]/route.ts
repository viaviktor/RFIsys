import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { Role } from '@prisma/client'
import crypto from 'crypto'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can process access requests
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the access request
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            client: true
          }
        },
        project: true
      }
    })

    if (!accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      )
    }

    if (accessRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the access request
      const updatedRequest = await tx.accessRequest.update({
        where: { id },
        data: {
          status,
          processedAt: new Date(),
          processedById: user.id
        }
      })

      // If approved, add as stakeholder and update contact
      if (status === 'APPROVED') {
        // Update contact to be registrationEligible with the requested role
        // This handles both new contacts and previously removed stakeholders
        await tx.contact.update({
          where: { id: accessRequest.contactId },
          data: {
            registrationEligible: true,
            role: accessRequest.requestedRole as Role,
            // Clear any previous password to ensure clean slate
            password: null,
            emailVerified: false,
          }
        })

        // Check if stakeholder relationship already exists (shouldn't happen, but handle it)
        const existingStakeholder = await tx.projectStakeholder.findUnique({
          where: {
            projectId_contactId: {
              projectId: accessRequest.projectId,
              contactId: accessRequest.contactId,
            },
          },
        })

        // Add as project stakeholder only if not already exists
        if (!existingStakeholder) {
          const stakeholderLevel = accessRequest.requestedRole === 'STAKEHOLDER_L1' ? 1 : 2
          await tx.projectStakeholder.create({
            data: {
              projectId: accessRequest.projectId,
              contactId: accessRequest.contactId,
              stakeholderLevel,
              addedById: user.id
            }
          })
        }

        // Clean up any existing unused registration tokens for this contact
        await tx.registrationToken.deleteMany({
          where: {
            contactId: accessRequest.contactId,
            usedAt: null,
          },
        })

        // Create registration token
        const tokenValue = crypto.randomBytes(32).toString('hex')
        const token = await tx.registrationToken.create({
          data: {
            token: tokenValue,
            email: accessRequest.contact.email,
            contactId: accessRequest.contactId,
            projectIds: [accessRequest.projectId],
            tokenType: 'AUTO_APPROVED',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        })

        // Send approval email with registration link
        try {
          const { sendAccessRequestApprovalEmail } = await import('@/lib/email')
          
          const emailResult = await sendAccessRequestApprovalEmail(
            {
              name: accessRequest.contact.name,
              email: accessRequest.contact.email
            },
            {
              name: accessRequest.project.name,
              projectNumber: accessRequest.project.projectNumber
            },
            {
              name: accessRequest.contact.client.name
            },
            token.token
          )
          
          if (emailResult.success) {
            console.log('✅ Access approval email sent successfully to:', accessRequest.contact.email)
          } else {
            console.error('❌ Failed to send access approval email:', emailResult.error)
          }
        } catch (emailError) {
          console.error('❌ Error sending access approval email:', emailError)
          // Continue even if email fails - the approval is still valid
        }
      }

      return updatedRequest
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update access request:', error)
    return NextResponse.json(
      { error: 'Failed to update access request' },
      { status: 500 }
    )
  }
}