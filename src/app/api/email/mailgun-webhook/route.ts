import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, parseReplyToEmail, cleanEmailContent } from '@/lib/mailgun'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Mailgun webhook received')

    const formData = await request.formData()
    
    // Extract webhook signature verification data
    const timestamp = formData.get('timestamp') as string
    const token = formData.get('token') as string
    const signature = formData.get('signature') as string

    // Verify webhook signature
    if (!verifyWebhookSignature(timestamp, token, signature)) {
      console.error('❌ Invalid Mailgun webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract email data
    const recipient = formData.get('recipient') as string
    const sender = formData.get('sender') as string
    const subject = formData.get('subject') as string
    const bodyPlain = formData.get('body-plain') as string
    const bodyHtml = formData.get('body-html') as string
    const attachmentCount = parseInt(formData.get('attachment-count') as string || '0')

    console.log('📧 Email details:', {
      recipient,
      sender,
      subject,
      attachmentCount,
      bodyLength: bodyPlain?.length || 0
    })

    // Parse the reply-to email to get RFI ID
    const parsedReply = parseReplyToEmail(recipient)
    if (!parsedReply || !parsedReply.isValid) {
      console.error('❌ Invalid or expired reply-to email:', recipient)
      return NextResponse.json({ error: 'Invalid reply address' }, { status: 400 })
    }

    const { rfiId } = parsedReply

    // Find the RFI
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        client: true,
        project: true,
        createdBy: true
      }
    })

    if (!rfi) {
      console.error('❌ RFI not found:', rfiId)
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Clean the email content
    const cleanedContent = cleanEmailContent(bodyPlain, bodyHtml)
    
    if (!cleanedContent.trim()) {
      console.error('❌ Empty email content after cleaning')
      return NextResponse.json({ error: 'Empty email content' }, { status: 400 })
    }

    // Find or create a user for the sender
    let responseAuthor = await prisma.user.findUnique({
      where: { email: sender }
    })

    if (!responseAuthor) {
      // Create a guest user for external responses
      const senderName = sender.split('@')[0] // Use email prefix as name
      responseAuthor = await prisma.user.create({
        data: {
          email: sender,
          name: `${senderName} (Client)`,
          password: '', // External users don't have passwords
          role: 'USER',
          active: false // Mark as inactive since it's an external user
        }
      })
      console.log('👤 Created guest user for external sender:', sender)
    }

    // Create the response
    const response = await prisma.response.create({
      data: {
        content: cleanedContent,
        rfiId: rfi.id,
        authorId: responseAuthor.id
      },
      include: {
        author: true
      }
    })

    // Update RFI status if it was OPEN (client responded)
    if (rfi.status === 'OPEN') {
      await prisma.rFI.update({
        where: { id: rfi.id },
        data: {
          status: 'CLOSED',
          dateReceived: new Date()
        }
      })
      console.log('✅ Updated RFI status to CLOSED')
    }

    // Log the email for audit trail
    await prisma.emailLog.create({
      data: {
        rfiId: rfi.id,
        recipientEmail: recipient,
        recipientName: 'System',
        subject: subject || 'Email Reply',
        body: cleanedContent,
        sentAt: new Date(),
        success: true,
        emailType: 'RFI_RESPONSE'
      }
    })

    // TODO: Send notification to internal team about the new response
    // This could include notifying the RFI creator and project stakeholders

    console.log('✅ Successfully processed email reply for RFI:', rfi.rfiNumber)
    console.log('📝 Response created by:', responseAuthor.name, `(${responseAuthor.email})`)

    return NextResponse.json({ 
      success: true, 
      message: 'Email processed successfully',
      rfiId: rfi.id,
      responseId: response.id
    })

  } catch (error) {
    console.error('❌ Error processing Mailgun webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    // This is a webhook verification request
    return new NextResponse(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  return NextResponse.json({ 
    message: 'Mailgun webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}