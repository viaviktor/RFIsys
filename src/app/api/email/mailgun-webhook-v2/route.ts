import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseReplyToEmail, cleanEmailContent, MAILGUN_CONFIG } from '@/lib/mailgun'
import crypto from 'crypto'

// Custom signature verification with better logging
function verifySignature(timestamp: string, token: string, signature: string): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || MAILGUN_CONFIG.webhookSigningKey || ''
  
  if (!signingKey) {
    console.error('❌ No webhook signing key configured')
    return false
  }
  
  const data = timestamp + token
  const expectedSignature = crypto
    .createHmac('sha256', signingKey)
    .update(data)
    .digest('hex')
  
  const isValid = signature === expectedSignature
  
  if (!isValid) {
    console.log('❌ Signature mismatch:', {
      received: signature.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...',
      keyLength: signingKey.length,
      timestamp,
      token: token.substring(0, 10) + '...'
    })
  }
  
  return isValid
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Mailgun webhook v2 received')

    const formData = await request.formData()
    
    // Extract webhook signature verification data
    const timestamp = formData.get('timestamp') as string
    const token = formData.get('token') as string
    const signature = formData.get('signature') as string

    // Verify webhook signature with better logging
    if (!verifySignature(timestamp, token, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract email data
    const recipient = formData.get('recipient') as string
    const sender = formData.get('sender') as string
    const subject = formData.get('subject') as string
    const bodyPlain = formData.get('body-plain') as string
    const bodyHtml = formData.get('body-html') as string

    console.log('📧 Email verified:', {
      recipient,
      sender,
      subject: subject?.substring(0, 50) + '...'
    })

    // Parse the reply-to email without strict token validation
    const match = recipient.match(/rfi-([^-]+)-([^@]+)@/)
    if (!match) {
      console.error('❌ Invalid email format:', recipient)
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const rfiId = match[1]
    console.log('🔍 Processing RFI:', rfiId)

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
      where: { email: sender.toLowerCase() }
    })

    if (!responseAuthor) {
      // Create a guest user for external responses
      const senderName = sender.split('@')[0]
      responseAuthor = await prisma.user.create({
        data: {
          email: sender.toLowerCase(),
          name: `${senderName} (Client)`,
          password: '',
          role: 'USER',
          active: false
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

    // Update RFI status if needed
    if (rfi.status === 'OPEN' && rfi.direction === 'OUTGOING') {
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
        body: cleanedContent.substring(0, 1000),
        sentAt: new Date(),
        success: true,
        emailType: 'RFI_RESPONSE'
      }
    })

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
  return NextResponse.json({ 
    message: 'Mailgun webhook v2 endpoint is active',
    timestamp: new Date().toISOString(),
    keyConfigured: !!(process.env.MAILGUN_WEBHOOK_SIGNING_KEY || MAILGUN_CONFIG.webhookSigningKey)
  })
}