import { NextRequest, NextResponse } from 'next/server'
import { generateReplyToEmail, parseReplyToEmail } from '@/lib/brevo'

// Test endpoint to verify email reply system
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rfiId = searchParams.get('rfiId') || 'test-rfi-123'
    
    // Generate a reply-to email
    const replyToEmail = generateReplyToEmail(rfiId)
    
    // Parse it back to verify
    const parsed = parseReplyToEmail(replyToEmail)
    
    return NextResponse.json({
      success: true,
      test: {
        rfiId,
        generatedEmail: replyToEmail,
        parsed: parsed,
        isValid: parsed?.isValid,
        extractedRfiId: parsed?.rfiId,
      },
      instructions: {
        setup: [
          '1. Set up Brevo subdomain: rfi.steel-detailer.com',
          '2. Point MX record to mail.brevo.com', 
          '3. Configure webhook in Brevo dashboard',
          '4. Set webhook URL to: https://yourdomain.com/api/rfis/email-reply',
          '5. Add environment variables: BREVO_API_KEY, BREVO_WEBHOOK_SECRET, BREVO_REPLY_DOMAIN'
        ],
        testing: [
          '1. Send test RFI email using /api/test/send-rfi endpoint',
          '2. Reply to the email from the recipient',
          '3. Check if response appears in RFI system',
          '4. Monitor webhook logs at /api/rfis/email-reply'
        ]
      }
    })
  } catch (error) {
    console.error('Email reply test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Test webhook payload processing
export async function POST(request: NextRequest) {
  try {
    const testPayload = {
      From: 'client@example.com',
      To: 'rfi-test-123-abc@rfi.steel-detailer.com',
      Subject: 'Re: RFI# RFI-2024-001 - Test RFI',
      Text: 'This is my response to your RFI. The issue is resolved. Please see attached drawings.',
      Html: '<p>This is my response to your RFI. The issue is resolved. Please see attached drawings.</p>',
      Date: new Date().toISOString(),
      MessageId: 'test-message-id-123',
      Attachments: [
        {
          Name: 'revised_drawing.pdf',
          ContentType: 'application/pdf',
          ContentLength: 245760,
          ContentID: 'ii_test123',
          DownloadToken: 'test-download-token-abc123'
        },
        {
          Name: 'connection_detail.dwg',
          ContentType: 'application/acad',
          ContentLength: 156342,
          ContentID: 'ii_test456',
          DownloadToken: 'test-download-token-def456'
        }
      ]
    }

    // Parse the email
    const parsed = parseReplyToEmail(testPayload.To)
    
    return NextResponse.json({
      success: true,
      testPayload,
      parsed,
      validation: {
        emailFormatValid: !!parsed,
        tokenValid: parsed?.isValid,
        rfiIdExtracted: parsed?.rfiId,
      },
      attachments: {
        count: testPayload.Attachments?.length || 0,
        details: testPayload.Attachments?.map(att => ({
          name: att.Name,
          type: att.ContentType,
          size: `${(att.ContentLength / 1024).toFixed(1)}KB`
        }))
      },
      nextSteps: [
        'If validation passes, this would create an RFI response',
        'User lookup by email would occur',
        'Response would be stored in database',
        'Email attachments would be downloaded and saved',
        'Attachment records would be created in database',
        'Email activity would be logged'
      ]
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}