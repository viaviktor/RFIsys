import { appConfig } from './env'
import { mailgunClient } from './mailgun'
import { brevoClient } from './brevo'
import { sendEmail as sendSmtpEmail, EmailOptions } from './email'
import { generateReplyToEmail as generateMailgunReplyTo } from './mailgun'
import { generateReplyToEmail as generateBrevoReplyTo } from './brevo'

export interface UnifiedEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

// Unified email service that can use different providers
export class EmailService {
  private provider: string

  constructor() {
    this.provider = appConfig.emailProvider || 'mailgun'
  }

  async sendEmail(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📧 Sending email via ${this.provider}:`, {
        to: Array.isArray(options.to) ? options.to.length + ' recipients' : options.to,
        subject: options.subject,
        provider: this.provider
      })

      switch (this.provider) {
        case 'mailgun':
          return await this.sendViaMailgun(options)
        
        case 'brevo':
          return await this.sendViaBrevo(options)
        
        case 'smtp':
        default:
          return await this.sendViaSmtp(options)
      }
    } catch (error) {
      console.error(`❌ Email sending failed via ${this.provider}:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      }
    }
  }

  private async sendViaMailgun(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      await mailgunClient.sendEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments
      })
      return { success: true }
    } catch (error) {
      throw new Error(`Mailgun error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async sendViaBrevo(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      
      await brevoClient.sendEmail({
        to: recipients.map(email => ({ email })),
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined
        // Note: Brevo attachments would need additional handling
      })
      return { success: true }
    } catch (error) {
      throw new Error(`Brevo error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async sendViaSmtp(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    const smtpOptions: EmailOptions = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    }

    return await sendSmtpEmail(smtpOptions)
  }

  // Generate reply-to email based on current provider
  generateReplyToEmail(rfiId: string): string {
    switch (this.provider) {
      case 'mailgun':
        return generateMailgunReplyTo(rfiId)
      
      case 'brevo':
        return generateBrevoReplyTo(rfiId)
      
      default:
        // Fallback to Mailgun format for SMTP
        return generateMailgunReplyTo(rfiId)
    }
  }

  // Get provider-specific webhook URL
  getWebhookUrl(): string {
    const baseUrl = appConfig.url
    
    switch (this.provider) {
      case 'mailgun':
        return `${baseUrl}/api/email/mailgun-webhook`
      
      case 'brevo':
        return `${baseUrl}/api/email/brevo-webhook`
      
      default:
        return `${baseUrl}/api/email/webhook`
    }
  }

  // Test email configuration
  async testConfiguration(): Promise<{ success: boolean; error?: string; provider: string }> {
    try {
      const testResult = await this.sendEmail({
        to: 'test@example.com', // This won't actually send
        subject: 'Configuration Test',
        html: '<h1>Test Email</h1><p>This is a configuration test.</p>',
        text: 'Test Email\n\nThis is a configuration test.'
      })

      return {
        success: testResult.success,
        error: testResult.error,
        provider: this.provider
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider
      }
    }
  }

  // Get current provider info
  getProviderInfo(): { provider: string; configured: boolean } {
    let configured = false

    switch (this.provider) {
      case 'mailgun':
        configured = !!(appConfig.mailgun.apiKey && appConfig.mailgun.domain)
        break
      
      case 'brevo':
        configured = !!appConfig.brevo.apiKey
        break
      
      case 'smtp':
        configured = !!(appConfig.email.host && appConfig.email.port)
        break
    }

    return { provider: this.provider, configured }
  }
}

// Singleton instance
export const emailService = new EmailService()

// Export for backward compatibility
export { emailService as default }