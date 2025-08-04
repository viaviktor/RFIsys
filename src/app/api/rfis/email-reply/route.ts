import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseReplyToEmail, cleanEmailContent, BREVO_CONFIG } from '@/lib/brevo'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// Brevo webhook payload interface
interface BrevoInboundPayload {
  From: string
  To: string
  Subject: string
  Text: string
  Html?: string
  Date: string
  MessageId: string
  Headers?: Record<string, string>
  Attachments?: BrevoAttachment[]
}

interface BrevoAttachment {
  Name: string
  ContentType: string
  ContentLength: number
  ContentID: string
  DownloadToken: string
}

// Function to download attachment from Brevo
async function downloadBrevoAttachment(attachment: BrevoAttachment): Promise<Buffer> {
  const response = await fetch(`https://api.brevo.com/v3/inbound/attachments/${attachment.DownloadToken}`, {
    method: 'GET',
    headers: {
      'api-key': BREVO_CONFIG.apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

// Function to process and save email attachments
async function processEmailAttachments(
  attachments: BrevoAttachment[], 
  rfiId: string,
  senderUserId: string
): Promise<void> {
  if (!attachments || attachments.length === 0) return

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads')
  try {
    await mkdir(uploadsDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  for (const attachment of attachments) {
    try {
      // Skip large files (>10MB)
      if (attachment.ContentLength > 10 * 1024 * 1024) {
        console.warn(`Skipping large attachment: ${attachment.Name} (${attachment.ContentLength} bytes)`)
        continue
      }

      // Skip potentially dangerous file types
      const dangerousTypes = ['.exe', '.bat', '.sh', '.script', '.app', '.com', '.pif', '.vbs']
      const lowerExtension = attachment.Name.toLowerCase().split('.').pop()
      if (lowerExtension && dangerousTypes.some(type => type.includes(lowerExtension))) {
        console.warn(`Skipping potentially dangerous file: ${attachment.Name}`)
        continue
      }

      // Download the attachment
      const fileBuffer = await downloadBrevoAttachment(attachment)

      // Generate unique filename to prevent conflicts
      const fileExtension = attachment.Name.split('.').pop() || ''
      const storedName = `${uuidv4()}.${fileExtension}`
      const filePath = join(uploadsDir, storedName)

      // Save file to disk
      await writeFile(filePath, fileBuffer)

      // Save attachment record to database
      await prisma.attachment.create({
        data: {
          filename: attachment.Name,
          storedName: storedName,
          url: `/uploads/${storedName}`,
          size: attachment.ContentLength,
          mimeType: attachment.ContentType,
          description: `Email attachment from ${attachment.Name}`,
          rfiId: rfiId,
          uploadedBy: senderUserId,
        },
      })

      console.log(`Successfully processed attachment: ${attachment.Name}`)
    } catch (error) {
      console.error(`Failed to process attachment ${attachment.Name}:`, error)
      // Continue processing other attachments even if one fails
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the inbound email data from Brevo
    const payload: BrevoInboundPayload = await request.json()
    
    console.log('Received inbound email:', {
      from: payload.From,
      to: payload.To,
      subject: payload.Subject,
    })

    // Extract RFI ID from the reply-to email address
    const parsedEmail = parseReplyToEmail(payload.To)
    if (!parsedEmail) {
      console.error('Invalid email format:', payload.To)
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!parsedEmail.isValid) {
      console.error('Invalid email token:', payload.To)
      return NextResponse.json({ error: 'Invalid email token' }, { status: 401 })
    }

    const { rfiId } = parsedEmail

    // Find the RFI
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        createdBy: true,
      },
    })

    if (!rfi) {
      console.error('RFI not found:', rfiId)
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Find the user who sent the email - check both users and contacts
    const senderEmail = payload.From.toLowerCase()
    const senderUser = await prisma.user.findUnique({
      where: { email: senderEmail },
    })
    
    const senderContact = !senderUser ? await prisma.contact.findFirst({
      where: { 
        email: senderEmail,
        password: { not: null }, // Only registered contacts can send email replies
      },
    }) : null

    if (!senderUser && !senderContact) {
      console.error('Sender not found for email:', payload.From)
      return NextResponse.json({ error: 'Unauthorized sender' }, { status: 401 })
    }

    // Clean the email content
    const cleanContent = cleanEmailContent(payload.Text, payload.Html)
    
    if (!cleanContent.trim()) {
      console.error('Empty email content after cleaning')
      return NextResponse.json({ error: 'Empty response content' }, { status: 400 })
    }

    // Create the RFI response - handle both internal users and stakeholders
    const responseData: any = {
      content: cleanContent,
      rfiId: rfi.id,
    }
    
    if (senderUser) {
      responseData.authorId = senderUser.id
    } else if (senderContact) {
      responseData.authorContactId = senderContact.id
    }

    const response = await prisma.response.create({
      data: responseData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        authorContact: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Process email attachments if present
    if (payload.Attachments && payload.Attachments.length > 0) {
      try {
        const uploaderId = senderUser ? senderUser.id : (senderContact ? senderContact.id : '')
        await processEmailAttachments(payload.Attachments, rfi.id, uploaderId)
        console.log(`Processed ${payload.Attachments.length} attachments for RFI ${rfiId}`)
      } catch (error) {
        console.error('Failed to process email attachments:', error)
        // Don't fail the entire request if attachments fail
      }
    }

    // Log the email activity
    await prisma.emailLog.create({
      data: {
        rfiId: rfi.id,
        emailType: 'REPLY_RECEIVED',
        recipientEmail: payload.From,
        subject: payload.Subject,
        success: true,
        body: cleanContent.substring(0, 1000), // Limit to first 1000 chars
      },
    })

    console.log('Successfully created RFI response from email:', {
      rfiId,
      responseId: response.id,
      sender: payload.From,
    })

    return NextResponse.json({
      success: true,
      responseId: response.id,
      rfiNumber: rfi.rfiNumber,
    })

  } catch (error) {
    console.error('Error processing inbound email:', error)
    
    // Log the error but don't expose internal details
    return NextResponse.json(
      { error: 'Failed to process email reply' },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  // Brevo may send GET requests to verify the webhook endpoint
  return NextResponse.json({ status: 'Webhook endpoint active' })
}

// Ensure only POST and GET methods are allowed
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}