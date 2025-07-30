import { NextRequest, NextResponse } from 'next/server'
import { mailgunClient } from '@/lib/mailgun'
import { emailService } from '@/lib/email-service'
import { generateReplyToEmail } from '@/lib/mailgun'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'info'

    switch (action) {
      case 'info':
        return await testMailgunInfo()
      
      case 'validate':
        return await testMailgunValidation()
      
      case 'reply-email':
        return await testReplyEmailGeneration()
      
      case 'send-test':
        const testEmail = searchParams.get('email')
        if (!testEmail) {
          return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
        }
        return await testEmailSending(testEmail)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: info, validate, reply-email, or send-test' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Mailgun test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testMailgunInfo() {
  const providerInfo = emailService.getProviderInfo()
  const webhookUrl = emailService.getWebhookUrl()

  return NextResponse.json({
    message: 'Mailgun configuration info',
    provider: providerInfo.provider,
    configured: providerInfo.configured,
    webhookUrl,
    timestamp: new Date().toISOString()
  })
}

async function testMailgunValidation() {
  try {
    const isValid = await mailgunClient.validateDomain()
    const stats = isValid ? await mailgunClient.getDomainStats() : null

    return NextResponse.json({
      message: 'Mailgun domain validation',
      valid: isValid,
      stats: stats || 'Unable to fetch stats',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      message: 'Mailgun domain validation failed',
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}

async function testReplyEmailGeneration() {
  const testRfiId = 'test-rfi-12345'
  const replyEmail = generateReplyToEmail(testRfiId)

  return NextResponse.json({
    message: 'Reply-to email generation test',
    testRfiId,
    generatedEmail: replyEmail,
    pattern: 'rfi-{rfiId}-{token}@mgrfi.steel-detailer.com',
    timestamp: new Date().toISOString()
  })
}

async function testEmailSending(testEmail: string) {
  try {
    const testRfiId = 'test-rfi-' + Date.now()
    const replyEmail = emailService.generateReplyToEmail(testRfiId)

    console.log('🧪 Testing email send to:', testEmail)
    
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'RFI System - Mailgun Test Email',
      html: `
        <h1>Mailgun Integration Test</h1>
        <p>This is a test email sent via Mailgun to verify the integration is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Provider: Mailgun</li>
          <li>Test RFI ID: ${testRfiId}</li>
          <li>Reply-to Email: ${replyEmail}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, the Mailgun integration is working properly!</p>
        <p>You can reply to this email to test the webhook integration.</p>
      `,
      text: `
Mailgun Integration Test

This is a test email sent via Mailgun to verify the integration is working correctly.

Test Details:
- Provider: Mailgun
- Test RFI ID: ${testRfiId}
- Reply-to Email: ${replyEmail}
- Timestamp: ${new Date().toISOString()}

If you received this email, the Mailgun integration is working properly!
You can reply to this email to test the webhook integration.
      `.trim(),
      replyTo: replyEmail
    })

    return NextResponse.json({
      message: 'Test email sent',
      success: result.success,
      error: result.error,
      testEmail,
      replyEmail,
      testRfiId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      message: 'Test email failed',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      testEmail,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}