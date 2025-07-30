import { prisma } from '@/lib/prisma'
import { mailgunClient } from '@/lib/mailgun'
import { brevoClient } from '@/lib/brevo'

export interface EmailProvider {
  name: 'mailgun' | 'brevo' | 'smtp'
  enabled: boolean
  settings: Record<string, string>
}

export async function getActiveEmailProvider(): Promise<EmailProvider | null> {
  try {
    // Get system email provider setting
    const systemProvider = await prisma.settings.findUnique({
      where: { key: 'system.emailProvider' }
    })

    if (!systemProvider?.value) {
      return null
    }

    const providerName = systemProvider.value as 'mailgun' | 'brevo' | 'smtp'

    // Get provider-specific settings
    const providerSettings = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: `${providerName}.`
        }
      }
    })

    const settingsMap = providerSettings.reduce((acc, setting) => {
      const key = setting.key.split('.')[1]
      acc[key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Check if provider is enabled
    const enabled = settingsMap.enabled === 'true'

    if (!enabled) {
      return null
    }

    return {
      name: providerName,
      enabled: true,
      settings: settingsMap
    }
  } catch (error) {
    console.error('Error getting active email provider:', error)
    return null
  }
}

export async function configureEmailProviders(): Promise<void> {
  const activeProvider = await getActiveEmailProvider()
  
  if (!activeProvider) {
    console.log('No active email provider configured')
    return
  }

  console.log(`Configuring email provider: ${activeProvider.name}`)

  switch (activeProvider.name) {
    case 'mailgun':
      if (activeProvider.settings.apiKey && activeProvider.settings.domain) {
        mailgunClient.updateConfig({
          apiKey: activeProvider.settings.apiKey,
          domain: activeProvider.settings.domain,
          webhookSigningKey: activeProvider.settings.webhookSigningKey || '',
          replyDomain: activeProvider.settings.replyDomain || activeProvider.settings.domain
        })
        console.log('Mailgun configured with database settings')
      } else {
        console.warn('Mailgun settings incomplete - missing API key or domain')
      }
      break

    case 'brevo':
      if (activeProvider.settings.apiKey) {
        brevoClient.updateConfig({
          apiKey: activeProvider.settings.apiKey,
          replyDomain: activeProvider.settings.replyDomain || '',
          webhookSecret: activeProvider.settings.webhookSecret || ''
        })
        console.log('Brevo configured with database settings')
      } else {
        console.warn('Brevo settings incomplete - missing API key')
      }
      break

    case 'smtp':
      // SMTP configuration is handled differently in the email.ts file
      console.log('SMTP provider selected - configuration handled in email.ts')
      break

    default:
      console.warn(`Unknown email provider: ${activeProvider.name}`)
  }
}

export async function sendEmailWithProvider(emailData: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
  replyTo?: string
  rfiId?: string // Add RFI ID for generating reply-to addresses
}): Promise<{ success: boolean; error?: string }> {
  const activeProvider = await getActiveEmailProvider()
  
  if (!activeProvider) {
    return { success: false, error: 'No email provider configured' }
  }

  // Configure the providers with database settings
  await configureEmailProviders()

  // Generate reply-to address if RFI ID is provided
  let replyToAddress = emailData.replyTo
  if (emailData.rfiId && !replyToAddress) {
    const { generateReplyToEmail: generateMailgunReplyTo } = await import('./mailgun')
    const { generateReplyToEmail: generateBrevoReplyTo } = await import('./brevo')
    
    switch (activeProvider.name) {
      case 'mailgun':
        replyToAddress = generateMailgunReplyTo(emailData.rfiId)
        break
      case 'brevo':
        replyToAddress = generateBrevoReplyTo(emailData.rfiId)
        break
      default:
        // For SMTP, use regular from address as reply-to
        replyToAddress = activeProvider.settings.from || 'noreply@rfisystem.local'
    }
  }

  try {
    switch (activeProvider.name) {
      case 'mailgun':
        await mailgunClient.sendEmail({
          ...emailData,
          replyTo: replyToAddress,
          from: `RFI System <noreply@${activeProvider.settings.domain}>` // Use proper FROM address
        })
        return { success: true }

      case 'brevo':
        const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
        await brevoClient.sendEmail({
          to: recipients.map(email => ({ email })),
          subject: emailData.subject,
          htmlContent: emailData.html,
          textContent: emailData.text,
          replyTo: replyToAddress ? { email: replyToAddress } : undefined,
          sender: { email: `noreply@${activeProvider.settings.replyDomain || 'steel-detailer.com'}`, name: 'RFI System' }
        })
        return { success: true }

      case 'smtp':
        // Import and use SMTP function with database settings
        const { sendEmail } = await import('@/lib/email')
        
        // Get SMTP settings from database
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

        return await sendEmail({
          ...emailData,
          smtpConfig: {
            host: smtpMap.host || 'localhost',
            port: parseInt(smtpMap.port || '587'),
            user: smtpMap.user || '',
            pass: smtpMap.pass || '',
            from: smtpMap.from || 'noreply@rfisystem.local'
          }
        })

      default:
        return { success: false, error: `Unsupported email provider: ${activeProvider.name}` }
    }
  } catch (error) {
    console.error(`Email sending failed with ${activeProvider.name}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email sending failed' 
    }
  }
}