import crypto from 'crypto'

// Mailgun configuration
export const MAILGUN_CONFIG = {
  apiKey: process.env.MAILGUN_API_KEY || '',
  domain: process.env.MAILGUN_DOMAIN || '',
  baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3',
  webhookSigningKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY || '',
  replyDomain: process.env.MAILGUN_REPLY_DOMAIN || 'mgrfi.steel-detailer.com',
}

// Daily email usage tracking
export interface EmailUsage {
  date: string
  sent: number
  limit: number
}

// Generate secure reply-to email address
export function generateReplyToEmail(rfiId: string): string {
  const timestamp = Date.now().toString()
  const token = crypto
    .createHmac('sha256', MAILGUN_CONFIG.webhookSigningKey)
    .update(`${rfiId}-${timestamp}`)
    .digest('hex')
    .substring(0, 16)

  return `rfi-${rfiId}-${token}@${MAILGUN_CONFIG.replyDomain}`
}

// Parse reply-to email to extract RFI ID and validate token
export function parseReplyToEmail(email: string): { rfiId: string; isValid: boolean } | null {
  const match = email.match(/rfi-([^-]+)-([^@]+)@/)
  if (!match) return null

  const [, rfiId, token] = match
  
  // Validate token (simplified - in production you'd want timestamp validation too)
  const expectedTokens = [
    // Generate a few possible tokens based on recent timestamps
    // to account for slight timing differences
    ...Array.from({ length: 5 }, (_, i) => {
      const timestamp = Date.now() - (i * 60000) // 1 minute intervals
      return crypto
        .createHmac('sha256', MAILGUN_CONFIG.webhookSigningKey)
        .update(`${rfiId}-${Math.floor(timestamp / 60000) * 60000}`)
        .digest('hex')
        .substring(0, 16)
    })
  ]

  const isValid = expectedTokens.includes(token)
  return { rfiId, isValid }
}

// Verify Mailgun webhook signature
export function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!MAILGUN_CONFIG.webhookSigningKey) {
    console.warn('Mailgun webhook signing key not configured')
    return false
  }

  const data = timestamp + token
  const expectedSignature = crypto
    .createHmac('sha256', MAILGUN_CONFIG.webhookSigningKey)
    .update(data)
    .digest('hex')

  return signature === expectedSignature
}

// Clean email content by removing quoted text and signatures
export function cleanEmailContent(text: string, html?: string): string {
  if (!text) return ''

  // Remove common email reply patterns
  const cleanText = text
    // Remove "On [date], [person] wrote:" patterns
    .replace(/^On .+wrote:\s*$/gm, '')
    // Remove quoted text starting with > 
    .replace(/^>.*$/gm, '')
    // Remove common signature separators
    .replace(/^\s*--\s*$/gm, '\n---SIGNATURE---\n')
    .split('\n---SIGNATURE---\n')[0] // Take everything before signature
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()

  return cleanText
}

// Mailgun API client
export class MailgunClient {
  private apiKey: string
  private domain: string
  private baseUrl: string

  constructor() {
    this.apiKey = MAILGUN_CONFIG.apiKey
    this.domain = MAILGUN_CONFIG.domain
    this.baseUrl = MAILGUN_CONFIG.baseUrl
  }

  async sendEmail(data: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    replyTo?: string
    from?: string
    attachments?: Array<{
      filename: string
      content: Buffer
      contentType: string
    }>
  }) {
    if (!this.apiKey || !this.domain) {
      throw new Error('Mailgun API key and domain must be configured')
    }

    // Check daily limits before sending
    const canSend = await this.checkDailyLimit()
    if (!canSend) {
      throw new Error('Daily email limit reached')
    }

    const formData = new FormData()
    
    // Basic email data
    formData.append('from', data.from || `RFI System <noreply@${this.domain}>`)
    
    // Handle multiple recipients
    const recipients = Array.isArray(data.to) ? data.to : [data.to]
    recipients.forEach(recipient => {
      formData.append('to', recipient)
    })
    
    formData.append('subject', data.subject)
    formData.append('html', data.html)
    
    if (data.text) {
      formData.append('text', data.text)
    }
    
    if (data.replyTo) {
      formData.append('h:Reply-To', data.replyTo)
    }

    // Add attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach(attachment => {
        const blob = new Blob([attachment.content], { type: attachment.contentType })
        formData.append('attachment', blob, attachment.filename)
      })
    }

    const response = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Mailgun API error: ${error}`)
    }

    // Track email usage
    await this.trackEmailSent()

    return await response.json()
  }

  async checkDailyLimit(): Promise<boolean> {
    try {
      const usage = await this.getDailyUsage()
      return usage.sent < (usage.limit - 10) // Leave 10 email buffer
    } catch {
      // If we can't check, assume we can send (fail open)
      return true
    }
  }

  async getDailyUsage(): Promise<EmailUsage> {
    const { getDailyEmailUsage } = await import('./email-usage')
    return await getDailyEmailUsage('mailgun')
  }

  private async trackEmailSent(): Promise<void> {
    const { trackEmailSent } = await import('./email-usage')
    await trackEmailSent('mailgun')
  }

  // Get domain statistics
  async getDomainStats() {
    if (!this.apiKey || !this.domain) {
      throw new Error('Mailgun API key and domain must be configured')
    }

    const response = await fetch(`${this.baseUrl}/${this.domain}/stats/total`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Mailgun API error: ${error}`)
    }

    return await response.json()
  }

  // Validate domain
  async validateDomain(): Promise<boolean> {
    try {
      await this.getDomainStats()
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
export const mailgunClient = new MailgunClient()