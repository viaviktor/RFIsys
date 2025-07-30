import nodemailer from 'nodemailer'
import { appConfig } from './env'
import { RFI, User, Client, Project } from '@/types'
import { format } from 'date-fns'
import { generateRFIPDF, type PDFResult } from './pdf'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

// Helper function to load attachment data as base64
async function loadAttachmentData(attachment: any): Promise<any> {
  if (!attachment.mimeType?.startsWith('image/')) {
    return attachment
  }
  
  try {
    const filePath = join(UPLOAD_DIR, attachment.storedName)
    const fileBuffer = await readFile(filePath)
    const base64Data = fileBuffer.toString('base64')
    return {
      ...attachment,
      data: base64Data
    }
  } catch (error) {
    console.error(`Failed to load attachment data for ${attachment.filename}:`, error)
    return attachment // Return without data if loading fails
  }
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
  smtpConfig?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
  }
}

// Create transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter(customConfig?: {
  host: string
  port: number
  user: string
  pass: string
  from: string
}) {
  const config = customConfig || {
    host: appConfig.email.host,
    port: appConfig.email.port,
    user: appConfig.email.user,
    pass: appConfig.email.pass,
    from: appConfig.email.from
  }

  if (!transporter || customConfig) {
    const transporterConfig = {
      host: config.host,
      port: config.port,
      secure: false, // true for 465, false for other ports
      auth: config.user && config.pass ? {
        user: config.user,
        pass: config.pass,
      } : undefined, // Explicitly disable auth for Mailhog
      // For development with Mailhog
      ignoreTLS: true,
      requireTLS: false,
      tls: {
        rejectUnauthorized: false
      },
      // Additional Mailhog compatibility
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000 // 10 seconds
    }

    if (customConfig) {
      return nodemailer.createTransport(transporterConfig)
    } else {
      transporter = nodemailer.createTransport(transporterConfig)
    }
  }
  return transporter
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!appConfig.features.emailNotifications && !options.smtpConfig) {
      console.log('Email notifications are disabled')
      return { success: false, error: 'Email notifications are disabled' }
    }

    const transporter = getTransporter(options.smtpConfig)
    
    const mailOptions = {
      from: options.smtpConfig?.from || appConfig.email.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    }

    console.log('Sending email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      from: mailOptions.from
    })

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true }
  } catch (error: any) {
    console.error('Error sending email:', error)
    
    // Handle specific SMTP errors with user-friendly messages
    let userMessage = 'Failed to send email'
    
    if (error.code === 'EENVELOPE') {
      userMessage = 'Invalid email address or recipient rejected'
    } else if (error.code === 'ECONNECTION') {
      userMessage = 'Email service unavailable - please try again later'
    } else if (error.code === 'EAUTH') {
      userMessage = 'Email authentication failed - please contact support'
    } else if (error.message?.includes('Invalid recipient')) {
      userMessage = 'Email address not accepted by server'
    }
    
    return { success: false, error: userMessage }
  }
}

// Email template functions
export function generateRFICreatedEmail(rfi: RFI & { 
  client: Client, 
  project: Project, 
  createdBy: User 
}): { subject: string; html: string; text: string } {
  const subject = `RFI# ${rfi.rfiNumber} - ${rfi.title}`
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.4;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 12px;
          padding: 20px;
        }
        
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #333;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #333;
          padding: 20px;
          background: #ffffff;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }
        
        .content {
          padding: 20px;
        }
        
        .top-section {
          display: table;
          width: 100%;
          margin-bottom: 20px;
          border-collapse: separate;
          border-spacing: 10px;
        }
        
        .rfi-details, .project-info {
          display: table-cell;
          width: 50%;
          border: 2px solid #333;
          padding: 12px;
          vertical-align: top;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .detail-row {
          margin-bottom: 6px;
          overflow: hidden;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        
        .detail-value {
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
        }
        
        .status-badge, .priority-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }
        
        .description-section {
          border: 2px solid #333;
          padding: 15px;
          margin: 20px 0;
        }
        
        .description-content {
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
          margin-top: 8px;
        }
        
        .response-section {
          border: 2px solid #333;
          padding: 15px;
          margin: 20px 0;
          min-height: 120px;
        }
        
        .response-label {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .response-note {
          font-size: 11px;
          color: #666;
          font-style: italic;
          margin-top: 8px;
        }
        
        .footer-info {
          border-top: 2px solid #333;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          font-size: 11px;
          color: #666;
        }
        
        .button {
          display: inline-block;
          background: #333;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border: 2px solid #333;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 15px 0;
        }
        
        .button:hover {
          background: #555;
          border-color: #555;
        }
        
        .button-container {
          text-align: center;
          margin: 20px 0;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 600px) {
          .top-section {
            display: block;
          }
          
          .rfi-details, .project-info {
            display: block;
            width: 100%;
            margin-bottom: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-title">Request for Information</div>
          <div class="header-subtitle">RFI# ${rfi.rfiNumber}</div>
        </div>
        
        <div class="content">
          <div class="top-section">
            <div class="rfi-details">
              <div class="section-header">RFI Details</div>
              
              <div class="detail-row">
                <div class="detail-label">RFI Number</div>
                <div class="detail-value">${rfi.rfiNumber}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Title</div>
                <div class="detail-value">${rfi.title}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                  <span class="status-badge" style="background: ${getStatusColor(rfi.status)}20; color: ${getStatusColor(rfi.status)}; border-color: ${getStatusColor(rfi.status)};">
                    ${rfi.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Priority</div>
                <div class="detail-value">
                  <span class="priority-badge" style="background: ${getPriorityColor(rfi.priority)}20; color: ${getPriorityColor(rfi.priority)}; border-color: ${getPriorityColor(rfi.priority)};">
                    ${rfi.priority}
                  </span>
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Urgency</div>
                <div class="detail-value">${rfi.urgency}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Direction</div>
                <div class="detail-value">${rfi.direction === 'OUTGOING' ? 'Outgoing (To Client)' : 'Incoming (From Client)'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Created By</div>
                <div class="detail-value">${rfi.createdBy.name}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Date Created</div>
                <div class="detail-value">${format(new Date(rfi.createdAt), 'MMM d, yyyy')}</div>
              </div>
              
              ${rfi.dateNeededBy ? `
              <div class="detail-row">
                <div class="detail-label">Date Needed By</div>
                <div class="detail-value">${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="project-info">
              <div class="section-header">Project Information</div>
              
              <div class="detail-row">
                <div class="detail-label">Project</div>
                <div class="detail-value">${rfi.project.name}</div>
              </div>
              
              ${rfi.project.projectNumber ? `
              <div class="detail-row">
                <div class="detail-label">Project Number</div>
                <div class="detail-value">${rfi.project.projectNumber}</div>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <div class="detail-label">Client</div>
                <div class="detail-value">${rfi.client.name}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Contact</div>
                <div class="detail-value">${rfi.client.contactName}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Email</div>
                <div class="detail-value">${rfi.client.email}</div>
              </div>
              
              ${rfi.client.phone ? `
              <div class="detail-row">
                <div class="detail-label">Phone</div>
                <div class="detail-value">${rfi.client.phone}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="description-section">
            <div class="section-header">Description</div>
            <div class="description-content">${rfi.description}</div>
          </div>
          
          ${rfi.suggestedSolution ? `
          <div class="description-section">
            <div class="section-header">Suggested Solution</div>
            <div class="description-content">${rfi.suggestedSolution}</div>
          </div>
          ` : ''}
          
          <div class="response-section">
            <div class="response-label">Response</div>
            <div class="response-note">This section can be used for written responses when printed.</div>
          </div>
          
          <div class="button-container">
            <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
              View RFI Online
            </a>
          </div>
        </div>
        
        <div class="footer-info">
          <div>Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div style="margin-top: 5px;">This is an automated notification. Please do not reply to this email.</div>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
New RFI Created: ${rfi.rfiNumber} - ${rfi.title}

Project: ${rfi.project.name}
Client: ${rfi.client.name}
Status: ${rfi.status}
Priority: ${rfi.priority}
Created By: ${rfi.createdBy.name}
Created Date: ${format(new Date(rfi.createdAt), 'MMM d, yyyy h:mm a')}

Description:
${rfi.description}

${rfi.suggestedSolution ? `Suggested Solution:\n${rfi.suggestedSolution}\n\n` : ''}

View RFI Details: ${appConfig.url}/dashboard/rfis/${rfi.id}

---
This email was sent from ${appConfig.name}
Please do not reply to this email.
  `.trim()
  
  return { subject, html, text }
}

export function generateRFIResponseEmail(
  rfi: RFI & { client: Client, project: Project },
  response: { content: string; author: User; createdAt: string }
): { subject: string; html: string; text: string } {
  const subject = `Response to RFI# ${rfi.rfiNumber} - ${rfi.title}`
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.4;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 12px;
          padding: 20px;
        }
        
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #333;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #333;
          padding: 20px;
          background: #10b981;
          color: white;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 16px;
          font-weight: 600;
        }
        
        .content {
          padding: 20px;
        }
        
        .project-info {
          border: 2px solid #333;
          padding: 12px;
          margin-bottom: 20px;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .detail-row {
          margin-bottom: 6px;
          overflow: hidden;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        
        .detail-value {
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
        }
        
        .response-section {
          border: 2px solid #10b981;
          padding: 15px;
          margin: 20px 0;
          background: #f0fdf4;
        }
        
        .response-header {
          font-size: 14px;
          font-weight: 700;
          color: #065f46;
          text-transform: uppercase;
          border-bottom: 1px solid #10b981;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .response-meta {
          font-size: 11px;
          color: #065f46;
          margin-bottom: 12px;
          font-weight: 600;
        }
        
        .response-content {
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
          color: #1a1a1a;
        }
        
        .footer-info {
          border-top: 2px solid #333;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          font-size: 11px;
          color: #666;
        }
        
        .button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border: 2px solid #10b981;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 15px 0;
        }
        
        .button:hover {
          background: #059669;
          border-color: #059669;
        }
        
        .button-container {
          text-align: center;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-title">RFI Response Received</div>
          <div class="header-subtitle">RFI# ${rfi.rfiNumber}</div>
        </div>
        
        <div class="content">
          <div class="project-info">
            <div class="section-header">Project Information</div>
            
            <div class="detail-row">
              <div class="detail-label">RFI Title</div>
              <div class="detail-value">${rfi.title}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Project</div>
              <div class="detail-value">${rfi.project.name}</div>
            </div>
            
            ${rfi.project.projectNumber ? `
            <div class="detail-row">
              <div class="detail-label">Project Number</div>
              <div class="detail-value">${rfi.project.projectNumber}</div>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <div class="detail-label">Client</div>
              <div class="detail-value">${rfi.client.name}</div>
            </div>
          </div>
          
          <div class="response-section">
            <div class="response-header">Response Details</div>
            <div class="response-meta">
              From: ${response.author.name} | Date: ${format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
            <div class="response-content">${response.content}</div>
          </div>
          
          <div class="button-container">
            <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
              View Full RFI
            </a>
          </div>
        </div>
        
        <div class="footer-info">
          <div>Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div style="margin-top: 5px;">This is an automated notification. Please do not reply to this email.</div>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
New Response to RFI ${rfi.rfiNumber}: ${rfi.title}

Project: ${rfi.project.name}
Client: ${rfi.client.name}

Response from ${response.author.name} - ${format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}:
${response.content}

View Full RFI: ${appConfig.url}/dashboard/rfis/${rfi.id}

---
This email was sent from ${appConfig.name}
Please do not reply to this email.
  `.trim()
  
  return { subject, html, text }
}

// Helper functions for colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT': return '#6b7280'
    case 'OPEN': return '#f59e0b'
    case 'CLOSED': return '#10b981'
    default: return '#6b7280'
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'LOW': return '#10b981'
    case 'MEDIUM': return '#f59e0b'
    case 'HIGH': return '#f97316'
    case 'URGENT': return '#ef4444'
    default: return '#6b7280'
  }
}

// Bulk email functions
export async function sendRFINotificationEmails(
  rfi: RFI & { client: Client, project: Project, createdBy: User, attachments?: any[] },
  recipients: string[],
  includePDFAttachment: boolean = false,
  includeFileAttachments: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const emailTemplate = generateRFICreatedEmail(rfi)
  
  let attachments: Array<{
    filename: string
    content: Buffer
    contentType: string
  }> = []
  
  // Generate PDF attachment if requested
  if (includePDFAttachment) {
    try {
      console.log('🔄 Generating PDF attachment for RFI email:', rfi.rfiNumber)
      // Load attachment data for images if attachments exist
      let rfiWithImageData = rfi
      if (rfi.attachments && rfi.attachments.length > 0) {
        const attachmentsWithData = await Promise.all(
          rfi.attachments.map(att => loadAttachmentData(att))
        )
        rfiWithImageData = {
          ...rfi,
          attachments: attachmentsWithData
        }
      }
      
      const pdfResult: PDFResult = await generateRFIPDF(rfiWithImageData as any)
      
      console.log('📄 PDF generation result:', {
        isPDF: pdfResult.isPDF,
        filename: pdfResult.filename,
        contentType: pdfResult.contentType,
        bufferSize: pdfResult.buffer.length
      })
      
      attachments.push({
        filename: pdfResult.filename,
        content: pdfResult.buffer,
        contentType: pdfResult.contentType
      })
      
      if (pdfResult.isPDF) {
        console.log('✅ PDF attachment generated successfully:', pdfResult.filename, 'Size:', pdfResult.buffer.length, 'bytes')
      } else {
        console.log('⚠️  PDF generation failed, attaching as text file:', pdfResult.filename, 'Size:', pdfResult.buffer.length, 'bytes')
      }
    } catch (error) {
      console.error('❌ Failed to generate PDF attachment:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      // Continue without PDF attachment rather than failing the entire email
    }
  }
  
  // Include file attachments if requested
  if (includeFileAttachments && rfi.attachments && rfi.attachments.length > 0) {
    const fs = await import('fs').then(m => m.promises)
    const path = await import('path')
    
    for (const attachment of rfi.attachments) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', attachment.filename)
        const fileBuffer = await fs.readFile(filePath)
        
        attachments.push({
          filename: attachment.originalName || attachment.filename,
          content: fileBuffer,
          contentType: attachment.mimeType || 'application/octet-stream'
        })
        
        console.log('File attachment added:', attachment.originalName || attachment.filename)
      } catch (error) {
        console.error('Failed to read file attachment:', attachment.filename, error)
        // Continue without this specific attachment
      }
    }
  }
  
  console.log('📧 Sending RFI email with attachments:', {
    recipients: recipients.length,
    attachments: attachments.length,
    attachmentDetails: attachments.map(a => ({ filename: a.filename, size: a.content.length, type: a.contentType }))
  })
  
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to: recipients,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments: attachments.length > 0 ? attachments : undefined
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to: recipients,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments: attachments.length > 0 ? attachments : undefined
    })
  }
}

export async function sendRFIResponseNotificationEmails(
  rfi: RFI & { client: Client, project: Project },
  response: { content: string; author: User; createdAt: string },
  recipients: string[],
  includePDFAttachment: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const emailTemplate = generateRFIResponseEmail(rfi, response)
  
  let attachments: Array<{
    filename: string
    content: Buffer
    contentType: string
  }> | undefined
  
  // Generate PDF attachment if requested
  if (includePDFAttachment) {
    try {
      console.log('Generating PDF attachment for RFI response email:', rfi.rfiNumber)
      // Load attachment data for images if attachments exist
      let rfiWithImageData = rfi
      if (rfi.attachments && rfi.attachments.length > 0) {
        const attachmentsWithData = await Promise.all(
          rfi.attachments.map(att => loadAttachmentData(att))
        )
        rfiWithImageData = {
          ...rfi,
          attachments: attachmentsWithData
        }
      }
      
      const pdfResult: PDFResult = await generateRFIPDF(rfiWithImageData as any)
      
      if (pdfResult.isPDF) {
        attachments = [{
          filename: pdfResult.filename,
          content: pdfResult.buffer,
          contentType: pdfResult.contentType
        }]
        console.log('PDF attachment generated successfully for response email:', pdfResult.filename)
      } else {
        // If PDF generation failed, attach as text file
        attachments = [{
          filename: pdfResult.filename,
          content: pdfResult.buffer,
          contentType: pdfResult.contentType
        }]
        console.log('PDF generation failed for response email, attaching as text file:', pdfResult.filename)
      }
    } catch (error) {
      console.error('Failed to generate PDF attachment for response email:', error)
      // Continue without attachment rather than failing the entire email
    }
  }
  
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to: recipients,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to: recipients,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments
    })
  }
}

// RFI Reminder email templates
export function generateRFIReminderEmail(rfi: RFI & { 
  client: Client, 
  project: Project, 
  createdBy: User 
}, reminderType: 'due_tomorrow' | 'overdue', daysOverdue?: number): { subject: string; html: string; text: string } {
  
  const isOverdue = reminderType === 'overdue'
  const daysSuffix = daysOverdue === 1 ? 'day' : 'days'
  
  const subject = isOverdue 
    ? `OVERDUE: RFI# ${rfi.rfiNumber} - ${rfi.title} (${daysOverdue} ${daysSuffix} overdue)`
    : `REMINDER: RFI# ${rfi.rfiNumber} - ${rfi.title} (Due Tomorrow)`
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.4;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 12px;
          padding: 20px;
        }
        
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'};
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid ${isOverdue ? '#ef4444' : '#f59e0b'};
          padding: 20px;
          background: ${isOverdue ? '#ef4444' : '#f59e0b'};
          color: white;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 16px;
          font-weight: 600;
        }
        
        .alert-section {
          padding: 20px;
          background: ${isOverdue ? '#fef2f2' : '#fefbf2'};
          border-bottom: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'};
          text-align: center;
        }
        
        .alert-text {
          font-size: 16px;
          font-weight: 700;
          color: ${isOverdue ? '#dc2626' : '#d97706'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .alert-details {
          font-size: 14px;
          color: ${isOverdue ? '#991b1b' : '#92400e'};
          margin-top: 8px;
          font-weight: 600;
        }
        
        .content {
          padding: 20px;
        }
        
        .top-section {
          display: table;
          width: 100%;
          margin-bottom: 20px;
          border-collapse: separate;
          border-spacing: 10px;
        }
        
        .rfi-details, .project-info {
          display: table-cell;
          width: 50%;
          border: 2px solid #333;
          padding: 12px;
          vertical-align: top;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .detail-row {
          margin-bottom: 6px;
          overflow: hidden;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        
        .detail-value {
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
        }
        
        .status-badge, .priority-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }
        
        .description-section {
          border: 2px solid #333;
          padding: 15px;
          margin: 20px 0;
        }
        
        .description-content {
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
          margin-top: 8px;
        }
        
        .action-section {
          border: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'};
          padding: 20px;
          margin: 20px 0;
          background: ${isOverdue ? '#fef2f2' : '#fefbf2'};
          text-align: center;
        }
        
        .action-text {
          font-size: 14px;
          font-weight: 700;
          color: ${isOverdue ? '#dc2626' : '#d97706'};
          margin-bottom: 15px;
        }
        
        .footer-info {
          border-top: 2px solid #333;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          font-size: 11px;
          color: #666;
        }
        
        .button {
          display: inline-block;
          background: ${isOverdue ? '#ef4444' : '#f59e0b'};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'};
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 15px 0;
        }
        
        .button:hover {
          background: ${isOverdue ? '#dc2626' : '#d97706'};
          border-color: ${isOverdue ? '#dc2626' : '#d97706'};
        }
        
        .button-container {
          text-align: center;
          margin: 20px 0;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 600px) {
          .top-section {
            display: block;
          }
          
          .rfi-details, .project-info {
            display: block;
            width: 100%;
            margin-bottom: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-title">${isOverdue ? 'OVERDUE RFI REMINDER' : 'RFI DUE TOMORROW'}</div>
          <div class="header-subtitle">RFI# ${rfi.rfiNumber}</div>
        </div>
        
        <div class="alert-section">
          <div class="alert-text">
            ${isOverdue ? `THIS RFI IS ${daysOverdue} ${daysSuffix.toUpperCase()} OVERDUE` : 'THIS RFI IS DUE TOMORROW'}
          </div>
          <div class="alert-details">
            ${rfi.dateNeededBy ? `Response needed by: ${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}` : 'Please respond as soon as possible'}
          </div>
        </div>
        
        <div class="content">
          <div class="top-section">
            <div class="rfi-details">
              <div class="section-header">RFI Details</div>
              
              <div class="detail-row">
                <div class="detail-label">RFI Number</div>
                <div class="detail-value">${rfi.rfiNumber}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Title</div>
                <div class="detail-value">${rfi.title}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                  <span class="status-badge" style="background: ${getStatusColor(rfi.status)}20; color: ${getStatusColor(rfi.status)}; border-color: ${getStatusColor(rfi.status)};">
                    ${rfi.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Priority</div>
                <div class="detail-value">
                  <span class="priority-badge" style="background: ${getPriorityColor(rfi.priority)}20; color: ${getPriorityColor(rfi.priority)}; border-color: ${getPriorityColor(rfi.priority)};">
                    ${rfi.priority}
                  </span>
                </div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Created By</div>
                <div class="detail-value">${rfi.createdBy.name}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Date Created</div>
                <div class="detail-value">${format(new Date(rfi.createdAt), 'MMM d, yyyy')}</div>
              </div>
              
              ${rfi.dateNeededBy ? `
              <div class="detail-row">
                <div class="detail-label">Date Needed By</div>
                <div class="detail-value">${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="project-info">
              <div class="section-header">Project Information</div>
              
              <div class="detail-row">
                <div class="detail-label">Project</div>
                <div class="detail-value">${rfi.project.name}</div>
              </div>
              
              ${rfi.project.projectNumber ? `
              <div class="detail-row">
                <div class="detail-label">Project Number</div>
                <div class="detail-value">${rfi.project.projectNumber}</div>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <div class="detail-label">Client</div>
                <div class="detail-value">${rfi.client.name}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Contact</div>
                <div class="detail-value">${rfi.client.contactName}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Email</div>
                <div class="detail-value">${rfi.client.email}</div>
              </div>
            </div>
          </div>
          
          <div class="description-section">
            <div class="section-header">Description</div>
            <div class="description-content">${rfi.description}</div>
          </div>
          
          ${rfi.suggestedSolution ? `
          <div class="description-section">
            <div class="section-header">Suggested Solution</div>
            <div class="description-content">${rfi.suggestedSolution}</div>
          </div>
          ` : ''}
          
          <div class="action-section">
            <div class="action-text">
              ${isOverdue 
                ? 'IMMEDIATE RESPONSE REQUIRED - This RFI is overdue and requires your urgent attention.'
                : 'RESPONSE NEEDED BY TOMORROW - Please provide your response to avoid delays.'
              }
            </div>
            
            <div class="button-container">
              <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
                ${isOverdue ? 'RESPOND NOW' : 'VIEW & RESPOND'}
              </a>
            </div>
          </div>
        </div>
        
        <div class="footer-info">
          <div>Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div style="margin-top: 5px;">This is an automated reminder. Please respond to avoid project delays.</div>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
${isOverdue ? 'OVERDUE' : 'REMINDER'}: RFI ${rfi.rfiNumber} - ${rfi.title}

${isOverdue ? `⚠️  THIS RFI IS ${daysOverdue} ${daysSuffix.toUpperCase()} OVERDUE` : '📅 THIS RFI IS DUE TOMORROW'}

Project: ${rfi.project.name}
Client: ${rfi.client.name}
Status: ${rfi.status}
Priority: ${rfi.priority}
Created By: ${rfi.createdBy.name}
Created Date: ${format(new Date(rfi.createdAt), 'MMM d, yyyy')}
${rfi.dateNeededBy ? `Response Needed By: ${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}` : ''}

Description:
${rfi.description}

${rfi.suggestedSolution ? `Suggested Solution:\n${rfi.suggestedSolution}\n\n` : ''}

${isOverdue 
  ? '🚨 IMMEDIATE RESPONSE REQUIRED - This RFI is overdue and requires your urgent attention.'
  : '⏰ RESPONSE NEEDED BY TOMORROW - Please provide your response to avoid delays.'
}

View RFI and Respond: ${appConfig.url}/dashboard/rfis/${rfi.id}

---
This is an automated reminder from ${appConfig.name}
Please respond to avoid project delays.
  `.trim()
  
  return { subject, html, text }
}

// Send reminder emails to stakeholders
export async function sendRFIReminderEmails(
  rfi: RFI & { client: Client, project: Project, createdBy: User },
  stakeholderEmails: string[],
  reminderType: 'due_tomorrow' | 'overdue',
  daysOverdue?: number
): Promise<{ success: boolean; error?: string }> {
  const emailTemplate = generateRFIReminderEmail(rfi, reminderType, daysOverdue)
  
  console.log(`📧 Sending ${reminderType} reminder for RFI ${rfi.rfiNumber} to ${stakeholderEmails.length} stakeholders`)
  
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to: stakeholderEmails,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to: stakeholderEmails,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    })
  }
}

// Test email function
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to,
      subject: 'RFI System - Test Email',
      html: `
        <h1>Test Email from RFI System</h1>
        <p>This is a test email to verify that the email system is working correctly.</p>
        <p>If you received this email, the email configuration is working properly.</p>
      `,
      text: 'Test Email from RFI System\n\nThis is a test email to verify that the email system is working correctly.\n\nIf you received this email, the email configuration is working properly.'
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to,
      subject: 'RFI System - Test Email',
      html: `
        <h1>Test Email from RFI System</h1>
        <p>This is a test email to verify that the email system is working correctly.</p>
        <p>If you received this email, the email configuration is working properly.</p>
      `,
      text: 'Test Email from RFI System\n\nThis is a test email to verify that the email system is working correctly.\n\nIf you received this email, the email configuration is working properly.'
    })
  }
}