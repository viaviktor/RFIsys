import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mailgunClient } from '@/lib/mailgun'
import { brevoClient } from '@/lib/brevo'
import { sendEmail as sendSmtpEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { provider, testEmail } = await request.json()

    if (!provider || !testEmail) {
      return NextResponse.json(
        { error: 'Provider and test email are required' },
        { status: 400 }
      )
    }

    // Get current settings for the provider
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: `${provider}.`
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.split('.')[1]
      acc[key] = setting.value
      return acc
    }, {} as Record<string, string>)

    const testEmailContent = {
      to: testEmail,
      subject: `${provider.toUpperCase()} Test Email - RFI System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Email Configuration Test</h2>
          <p>This is a test email to verify your <strong>${provider.toUpperCase()}</strong> configuration.</p>
          <p><strong>Provider:</strong> ${provider}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Test recipient:</strong> ${testEmail}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from the RFI System admin panel to test email configuration.
            If you received this email, your ${provider} configuration is working correctly.
          </p>
        </div>
      `,
      text: `
        Email Configuration Test
        
        This is a test email to verify your ${provider.toUpperCase()} configuration.
        
        Provider: ${provider}
        Timestamp: ${new Date().toISOString()}
        Test recipient: ${testEmail}
        
        If you received this email, your ${provider} configuration is working correctly.
      `
    }

    let result: { success: boolean; error?: string; message?: string }

    try {
      switch (provider) {
        case 'mailgun':
          if (!settingsMap.apiKey || !settingsMap.domain) {
            return NextResponse.json({
              success: false,
              error: 'Mailgun API key and domain must be configured'
            })
          }
          
          await mailgunClient.sendEmail(testEmailContent)
          result = { 
            success: true, 
            message: `Test email sent successfully via Mailgun to ${testEmail}` 
          }
          break

        case 'brevo':
          if (!settingsMap.apiKey) {
            return NextResponse.json({
              success: false,
              error: 'Brevo API key must be configured'
            })
          }
          
          await brevoClient.sendEmail({
            to: [{ email: testEmail }],
            subject: testEmailContent.subject,
            htmlContent: testEmailContent.html,
            textContent: testEmailContent.text
          })
          result = { 
            success: true, 
            message: `Test email sent successfully via Brevo to ${testEmail}` 
          }
          break

        case 'smtp':
          const smtpSettings = await prisma.settings.findMany({
            where: {
              key: {
                startsWith: 'email.'
              }
            }
          })
          
          const smtpMap = smtpSettings.reduce((acc, setting) => {
            const key = setting.key.split('.')[1]
            acc[key] = setting.value
            return acc
          }, {} as Record<string, string>)

          if (!smtpMap.host || !smtpMap.port) {
            return NextResponse.json({
              success: false,
              error: 'SMTP host and port must be configured'
            })
          }

          // Format the email options properly for SMTP
          const smtpEmailOptions = {
            to: testEmail,
            subject: testEmailContent.subject,
            html: testEmailContent.html,
            text: testEmailContent.text,
            smtpConfig: {
              host: smtpMap.host,
              port: parseInt(smtpMap.port),
              user: smtpMap.user || '',
              pass: smtpMap.pass || '',
              from: smtpMap.from || 'noreply@rfisystem.local'
            }
          }

          const smtpResult = await sendSmtpEmail(smtpEmailOptions)
          result = smtpResult.success ? 
            { success: true, message: `Test email sent successfully via SMTP to ${testEmail}` } :
            { success: false, error: smtpResult.error || 'SMTP send failed' }
          break

        default:
          return NextResponse.json({
            success: false,
            error: `Unknown provider: ${provider}`
          }, { status: 400 })
      }

      // For test emails, we'll skip logging to avoid foreign key constraint issues
      // In a production system, you might want to create a special test RFI or modify the schema
      console.log('Test email result:', result)

      return NextResponse.json(result)

    } catch (error) {
      console.error(`Email test failed for ${provider}:`, error)
      
      // For test emails, we'll skip logging to avoid foreign key constraint issues
      console.log('Test email error:', error instanceof Error ? error.message : 'Unknown error')

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Email test failed'
      })
    }

  } catch (error) {
    console.error('Test email endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}