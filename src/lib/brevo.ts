import crypto from 'crypto'

// Brevo configuration
export const BREVO_CONFIG = {
  apiKey: process.env.BREVO_API_KEY || '',
  apiUrl: 'https://api.brevo.com/v3',
  replyDomain: process.env.BREVO_REPLY_DOMAIN || 'rfi.steel-detailer.com',
  webhookSecret: process.env.BREVO_WEBHOOK_SECRET || '',
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
    .createHmac('sha256', BREVO_CONFIG.webhookSecret)
    .update(`${rfiId}-${timestamp}`)
    .digest('hex')
    .substring(0, 16)

  return `rfi-${rfiId}-${token}@${BREVO_CONFIG.replyDomain}`
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
        .createHmac('sha256', BREVO_CONFIG.webhookSecret)
        .update(`${rfiId}-${Math.floor(timestamp / 60000) * 60000}`)
        .digest('hex')
        .substring(0, 16)
    })
  ]

  const isValid = expectedTokens.includes(token)
  return { rfiId, isValid }
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

// Brevo API client
export class BrevoClient {
  private apiKey: string
  private baseUrl: string
  private replyDomain: string
  private webhookSecret: string

  constructor() {
    this.apiKey = BREVO_CONFIG.apiKey
    this.baseUrl = BREVO_CONFIG.apiUrl
    this.replyDomain = BREVO_CONFIG.replyDomain
    this.webhookSecret = BREVO_CONFIG.webhookSecret
  }

  getConfig() {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      replyDomain: this.replyDomain,
      webhookSecret: this.webhookSecret
    }
  }

  updateConfig(config: Partial<{
    apiKey: string
    baseUrl: string
    replyDomain: string
    webhookSecret: string
  }>) {
    if (config.apiKey !== undefined) this.apiKey = config.apiKey
    if (config.baseUrl !== undefined) this.baseUrl = config.baseUrl
    if (config.replyDomain !== undefined) this.replyDomain = config.replyDomain
    if (config.webhookSecret !== undefined) this.webhookSecret = config.webhookSecret
  }

  async sendEmail(data: {
    to: { email: string; name?: string }[]
    subject: string
    htmlContent: string
    textContent?: string
    replyTo?: { email: string; name?: string }
    sender?: { email: string; name?: string }
  }) {
    if (!this.apiKey) {
      throw new Error('Brevo API key not configured')
    }

    // Check daily limits before sending
    const canSend = await this.checkDailyLimit()
    if (!canSend) {
      throw new Error('Daily email limit reached')
    }

    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: data.sender || { email: 'noreply@steel-detailer.com', name: 'Steel RFI System' },
        to: data.to,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        replyTo: data.replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Brevo API error: ${error.message || 'Unknown error'}`)
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
    return await getDailyEmailUsage('brevo')
  }

  private async trackEmailSent(): Promise<void> {
    const { trackEmailSent } = await import('./email-usage')
    await trackEmailSent('brevo')
  }
}

// Singleton instance
export const brevoClient = new BrevoClient()