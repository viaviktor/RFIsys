import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { sendRFINotificationEmails } from '@/lib/email'
import { z } from 'zod'

const emailRequestSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  includeAttachments: z.boolean().optional().default(false),
  includePDFAttachment: z.boolean().optional().default(true),
  customMessage: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rfiId } = await params
    const body = await request.json()
    
    // Validate request body
    const result = emailRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.issues },
        { status: 400 }
      )
    }

    const { recipients, includeAttachments, includePDFAttachment, customMessage } = result.data

    // Fetch RFI with all related data
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        client: true,
        project: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: (includeAttachments || includePDFAttachment) ? {
          orderBy: { createdAt: 'desc' },
        } : false,
      },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Send email notifications with attachments if requested
    const emailResult = await sendRFINotificationEmails(rfi as any, recipients, includePDFAttachment, includeAttachments)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email notifications' },
        { status: 500 }
      )
    }

    // Change status from DRAFT to OPEN when email is sent (if currently DRAFT)
    if (rfi.status === 'DRAFT') {
      await prisma.rFI.update({
        where: { id: rfiId },
        data: { 
          status: 'OPEN',
          dateSent: new Date()
        }
      })
    }

    // Log the email activity
    console.log(`RFI ${rfi.rfiNumber} email sent to:`, recipients.join(', '))

    return NextResponse.json({
      success: true,
      message: `Email notifications sent to ${recipients.length} recipient(s)`,
      recipients: recipients.length
    })

  } catch (error) {
    console.error('Error sending RFI email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}