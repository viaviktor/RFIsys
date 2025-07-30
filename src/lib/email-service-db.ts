import { prisma } from './prisma'
import { mailgunClient, MailgunClient } from './mailgun'
import { brevoClient, BrevoClient } from './brevo'
import { sendEmail as sendSmtpEmail, EmailOptions } from './email'

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

interface EmailSettings {
  provider: string
  mailgun?: {
    apiKey: string
    domain: string
    webhookSigningKey: string
    replyDomain: string
    enabled: boolean
  }
  brevo?: {
    apiKey: string
    replyDomain: string
    webhookSecret: string
    enabled: boolean
  }
  smtp?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    enabled: boolean
  }
}

// Cache for settings to avoid database queries on every email
let settingsCache: EmailSettings | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getEmailSettings(): Promise<EmailSettings> {
  const now = Date.now()
  
  // Return cached settings if still valid
  if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return settingsCache
  }

  // Fetch all email-related settings
  const settings = await prisma.settings.findMany({
    where: {
      OR: [
        { key: { startsWith: 'mailgun.' } },
        { key: { startsWith: 'brevo.' } },
        { key: { startsWith: 'email.' } },
        { key: 'system.emailProvider' }
      ]
    }
  })

  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)

  // Determine active provider
  const provider = settingsMap['system.emailProvider'] || 
                  (settingsMap['mailgun.enabled'] === 'true' ? 'mailgun' : 
                   settingsMap['brevo.enabled'] === 'true' ? 'brevo' : 'smtp')

  const emailSettings: EmailSettings = {
    provider,
    mailgun: {
      apiKey: settingsMap['mailgun.apiKey'] || '',
      domain: settingsMap['mailgun.domain'] || '',
      webhookSigningKey: settingsMap['mailgun.webhookSigningKey'] || '',
      replyDomain: settingsMap['mailgun.replyDomain'] || '',
      enabled: settingsMap['mailgun.enabled'] === 'true'
    },
    brevo: {
      apiKey: settingsMap['brevo.apiKey'] || '',
      replyDomain: settingsMap['brevo.replyDomain'] || '',
      webhookSecret: settingsMap['brevo.webhookSecret'] || '',
      enabled: settingsMap['brevo.enabled'] === 'true'
    },
    smtp: {
      host: settingsMap['email.host'] || 'localhost',
      port: parseInt(settingsMap['email.port'] || '587'),
      user: settingsMap['email.user'] || '',
      pass: settingsMap['email.pass'] || '',
      from: settingsMap['email.from'] || 'noreply@example.com',
      enabled: settingsMap['email.enabled'] === 'true'
    }
  }

  // Cache the settings
  settingsCache = emailSettings
  cacheTimestamp = now

  return emailSettings
}

// Settings-aware email service
export class DatabaseEmailService {
  private settings: EmailSettings | null = null

  async loadSettings() {
    this.settings = await getEmailSettings()
  }

  async sendEmail(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.settings) {
        await this.loadSettings()
      }

      const { provider } = this.settings!

      console.log(`📧 Sending email via ${provider}:`, {
        to: Array.isArray(options.to) ? options.to.length + ' recipients' : options.to,
        subject: options.subject,
        provider
      })

      switch (provider) {
        case 'mailgun':
          return await this.sendViaMailgun(options)
        
        case 'brevo':
          return await this.sendViaBrevo(options)
        
        case 'smtp':
        default:
          return await this.sendViaSmtp(options)
      }
    } catch (error) {
      console.error(`❌ Email sending failed:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      }
    }
  }

  private async sendViaMailgun(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    const { mailgun } = this.settings!
    
    if (!mailgun?.enabled || !mailgun.apiKey || !mailgun.domain) {
      throw new Error('Mailgun not properly configured')
    }

    try {
      // Create a configured Mailgun client with database settings
      const client = new MailgunClient()
      
      // Override the configuration temporarily
      const originalConfig = client.getConfig()
      client.updateConfig({
        apiKey: mailgun.apiKey,
        domain: mailgun.domain,
        webhookSigningKey: mailgun.webhookSigningKey,
        replyDomain: mailgun.replyDomain
      })

      await client.sendEmail(options)
      
      // Restore original config
      client.updateConfig(originalConfig)
      
      return { success: true }
    } catch (error) {
      throw new Error(`Mailgun error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async sendViaBrevo(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    const { brevo } = this.settings!
    
    if (!brevo?.enabled || !brevo.apiKey) {
      throw new Error('Brevo not properly configured')
    }

    try {
      // Create a configured Brevo client with database settings
      const client = new BrevoClient()
      
      // Override the configuration temporarily
      const originalConfig = client.getConfig()
      client.updateConfig({
        apiKey: brevo.apiKey,
        replyDomain: brevo.replyDomain,
        webhookSecret: brevo.webhookSecret
      })

      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      
      await client.sendEmail({
        to: recipients.map(email => ({ email })),
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined
      })
      
      // Restore original config
      client.updateConfig(originalConfig)
      
      return { success: true }
    } catch (error) {
      throw new Error(`Brevo error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async sendViaSmtp(options: UnifiedEmailOptions): Promise<{ success: boolean; error?: string }> {
    const { smtp } = this.settings!
    
    if (!smtp?.enabled || !smtp.host) {
      throw new Error('SMTP not properly configured')
    }

    const smtpOptions: EmailOptions = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      // Override SMTP config
      smtpConfig: {
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        pass: smtp.pass,
        from: smtp.from
      }
    }

    return await sendSmtpEmail(smtpOptions)
  }

  // Generate reply-to email based on current provider settings
  async generateReplyToEmail(rfiId: string): Promise<string> {
    if (!this.settings) {
      await this.loadSettings()
    }

    const { provider } = this.settings!

    switch (provider) {
      case 'mailgun':
        return this.generateMailgunReplyTo(rfiId)
      
      case 'brevo':
        return this.generateBrevoReplyTo(rfiId)
      
      default:
        // Fallback to Mailgun format for SMTP
        return this.generateMailgunReplyTo(rfiId)
    }
  }

  private generateMailgunReplyTo(rfiId: string): string {
    const { mailgun } = this.settings!
    const crypto = require('crypto')
    
    const timestamp = Date.now().toString()
    const token = crypto
      .createHmac('sha256', mailgun?.webhookSigningKey || 'default-key')
      .update(`${rfiId}-${timestamp}`)
      .digest('hex')
      .substring(0, 16)

    return `rfi-${rfiId}-${token}@${mailgun?.replyDomain || 'rfi.localhost'}`
  }

  private generateBrevoReplyTo(rfiId: string): string {
    const { brevo } = this.settings!
    const crypto = require('crypto')
    
    const timestamp = Date.now().toString()
    const token = crypto
      .createHmac('sha256', brevo?.webhookSecret || 'default-secret')
      .update(`${rfiId}-${timestamp}`)
      .digest('hex')
      .substring(0, 16)

    return `rfi-${rfiId}-${token}@${brevo?.replyDomain || 'rfi.localhost'}`
  }

  // Get current provider info
  async getProviderInfo(): Promise<{ provider: string; configured: boolean }> {
    if (!this.settings) {
      await this.loadSettings()
    }

    const { provider } = this.settings!
    let configured = false

    switch (provider) {
      case 'mailgun':
        configured = !!(this.settings?.mailgun?.enabled && 
                       this.settings?.mailgun?.apiKey && 
                       this.settings?.mailgun?.domain)
        break
      
      case 'brevo':
        configured = !!(this.settings?.brevo?.enabled && 
                       this.settings?.brevo?.apiKey)
        break
      
      case 'smtp':
        configured = !!(this.settings?.smtp?.enabled && 
                       this.settings?.smtp?.host)
        break
    }

    return { provider, configured }
  }

  // Clear settings cache (useful after updating settings)
  clearCache() {
    settingsCache = null
    cacheTimestamp = 0
  }

  // Test configuration
  async testConfiguration(): Promise<{ success: boolean; error?: string; provider: string }> {
    try {
      const providerInfo = await this.getProviderInfo()
      
      if (!providerInfo.configured) {
        return {
          success: false,
          error: `${providerInfo.provider} is not properly configured`,
          provider: providerInfo.provider
        }
      }

      // Send a test email (this won't actually send)
      const testResult = await this.sendEmail({
        to: 'test@example.com',
        subject: 'Configuration Test',
        html: '<h1>Test Email</h1><p>This is a configuration test.</p>',
        text: 'Test Email\n\nThis is a configuration test.'
      })

      return {
        success: testResult.success,
        error: testResult.error,
        provider: providerInfo.provider
      }
    } catch (error) {
      const providerInfo = await this.getProviderInfo()
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: providerInfo.provider
      }
    }
  }
}

// Singleton instance
export const databaseEmailService = new DatabaseEmailService()

// Export for backward compatibility
export { databaseEmailService as default }