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
        contact: true,
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
        await tx.contact.update({
          where: { id: accessRequest.contactId },
          data: {
            registrationEligible: true,
            role: accessRequest.requestedRole as Role
          }
        })

        // Add as project stakeholder
        const stakeholderLevel = accessRequest.requestedRole === 'STAKEHOLDER_L1' ? 1 : 2
        await tx.projectStakeholder.create({
          data: {
            projectId: accessRequest.projectId,
            contactId: accessRequest.contactId,
            stakeholderLevel,
            addedById: user.id
          }
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

        // TODO: Send approval email with registration link
        console.log('Access approved, registration token created:', token.token)
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