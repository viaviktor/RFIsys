import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanEmailContent } from '@/lib/mailgun'
import crypto from 'crypto'

// Get signing key from environment or use fallback
const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '9c529e89347ddadb362cb3991a5f1b9f'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Simple Mailgun webhook received')

    const formData = await request.formData()
    
    // Extract webhook data
    const timestamp = formData.get('timestamp') as string
    const token = formData.get('token') as string
    const signature = formData.get('signature') as string
    
    // Verify signature
    const data = timestamp + token
    const expectedSignature = crypto
      .createHmac('sha256', SIGNING_KEY)
      .update(data)
      .digest('hex')
    
    if (signature !== expectedSignature) {
      console.error('❌ Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract email data
    const recipient = formData.get('recipient') as string
    const sender = formData.get('sender') as string
    const bodyPlain = formData.get('body-plain') as string
    const bodyHtml = formData.get('body-html') as string

    // Parse RFI ID
    const match = recipient.match(/rfi-([^-]+)-([^@]+)@/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const rfiId = match[1]

    // Find RFI with project info
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: { project: true }
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Find user (internal or contact)
    let authorId: string | null = null
    let authorType: 'user' | 'contact' = 'user'
    
    // First check internal users
    const user = await prisma.user.findFirst({
      where: { 
        email: sender.toLowerCase(),
        deletedAt: null
      }
    })
    
    if (user) {
      authorId = user.id
      authorType = 'user'
    } else {
      // Check contacts table
      const contact = await prisma.contact.findFirst({
        where: {
          email: sender.toLowerCase(),
          deletedAt: null
        }
      })
      
      if (contact) {
        // Verify contact has access to this RFI's project (if project exists)
        if (rfi.project) {
          const hasAccess = await prisma.projectStakeholder.findFirst({
            where: {
              projectId: rfi.project.id,
              contactId: contact.id
            }
          })
          
          if (!hasAccess) {
            console.error('❌ Contact does not have access to this project')
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
          }
        }
        
        authorId = contact.id
        authorType = 'contact'
      } else {
        // Unknown sender - reject
        console.error('❌ Unknown sender:', sender)
        return NextResponse.json({ error: 'Unknown sender' }, { status: 403 })
      }
    }

    // Clean content
    const cleanedContent = cleanEmailContent(bodyPlain, bodyHtml)

    // Create response based on author type
    const response = await prisma.response.create({
      data: {
        content: cleanedContent,
        rfiId: rfi.id,
        authorId: authorType === 'user' ? authorId : null,
        authorContactId: authorType === 'contact' ? authorId : null
      }
    })

    console.log('✅ Response created:', response.id)

    return NextResponse.json({ 
      success: true,
      responseId: response.id
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple webhook active',
    keyConfigured: true
  })
}