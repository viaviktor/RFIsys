import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseReplyToEmail, cleanEmailContent } from '@/lib/mailgun'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 TEST WEBHOOK - Received Mailgun webhook (NO signature validation)')
    
    const formData = await request.formData()
    
    // Log all form data
    const data: Record<string, any> = {}
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }
    
    console.log('📧 Webhook data:', {
      recipient: data.recipient,
      sender: data.sender,
      subject: data.subject,
      timestamp: data.timestamp,
      token: data.token,
      signature: data.signature,
      bodyLength: data['body-plain']?.length || 0
    })
    
    // Try to process the email
    const recipient = data.recipient as string
    const sender = data.sender as string
    const bodyPlain = data['body-plain'] as string
    const bodyHtml = data['body-html'] as string
    
    if (!recipient || !sender) {
      return NextResponse.json({ 
        error: 'Missing recipient or sender',
        receivedData: Object.keys(data)
      }, { status: 400 })
    }
    
    // Parse the reply-to email WITHOUT token validation
    const match = recipient.match(/rfi-([^-]+)-([^@]+)@/)
    if (!match) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        recipient
      }, { status: 400 })
    }
    
    const rfiId = match[1]
    const token = match[2]
    
    console.log('🔓 BYPASSING token validation:', { rfiId, token })
    
    // Find the RFI
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId }
    })
    
    if (!rfi) {
      return NextResponse.json({ 
        error: 'RFI not found',
        rfiId
      }, { status: 404 })
    }
    
    // Find or create user
    let user = await prisma.user.findFirst({
      where: { 
        email: sender.toLowerCase(),
        deletedAt: null // Only check non-deleted users
      }
    })
    
    if (!user) {
      // Create guest user
      const emailName = sender.split('@')[0]
      user = await prisma.user.create({
        data: {
          email: sender.toLowerCase(),
          name: `${emailName} (External)`,
          password: '',
          role: 'USER',
          active: false
        }
      })
      console.log('Created guest user:', user.email)
    }
    
    // Clean content
    const cleanedContent = cleanEmailContent(bodyPlain, bodyHtml)
    
    // Create response
    const response = await prisma.response.create({
      data: {
        content: cleanedContent,
        rfiId: rfi.id,
        authorId: user.id
      }
    })
    
    console.log('✅ TEST WEBHOOK - Created response:', {
      responseId: response.id,
      rfiNumber: rfi.rfiNumber,
      author: user.email
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'TEST WEBHOOK - Response created successfully',
      responseId: response.id,
      rfiNumber: rfi.rfiNumber
    })
    
  } catch (error) {
    console.error('❌ TEST WEBHOOK ERROR:', error)
    return NextResponse.json({ 
      error: 'Test webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// For testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Mailgun test webhook (NO signature validation)',
    timestamp: new Date().toISOString()
  })
}