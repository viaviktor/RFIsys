import nodemailer from 'nodemailer'
import { appConfig } from './env'
import { RFI, User, Client, Project } from '@/types'
import { format } from 'date-fns'
import { generateRFIPDF, type PDFResult } from './pdf'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createRegistrationToken, getContactRegistrationStatus, generateRegistrationUrl } from './registration-tokens'
import { prisma } from './prisma'

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
}, recipientData?: { 
  email: string, 
  isRegistered: boolean, 
  registrationToken?: string 
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
        /* CSS Reset and Base Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 14px;
          padding: 20px;
        }
        
        /* Container and Layout */
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
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 18px;
          color: #333;
          font-weight: 600;
        }
        
        .content {
          padding: 20px;
        }
        
        /* Text-friendly table layout - converts well to plain text */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border: 2px solid #333;
        }
        
        .info-table td {
          padding: 12px;
          border: 1px solid #666;
          vertical-align: top;
        }
        
        .info-table .section-header {
          background: #f8f9fa;
          font-weight: 700;
          font-size: 16px;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          border-bottom: 2px solid #333;
        }
        
        .info-row {
          margin-bottom: 12px;
        }
        
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          display: block;
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 500;
          display: block;
        }
        
        /* Status and priority badges that convert to readable text */
        .status-badge, .priority-badge {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
        }
        
        /* Content sections with clear text separators */
        .content-section {
          margin: 30px 0;
          border: 2px solid #333;
          padding: 20px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #666;
          letter-spacing: 0.5px;
        }
        
        .section-content {
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: #1a1a1a;
        }
        
        /* Response section with clear formatting */
        .response-section {
          border: 2px solid #333;
          padding: 20px;
          margin: 30px 0;
          min-height: 120px;
          background: #fafafa;
        }
        
        .response-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          margin-bottom: 10px;
          border-bottom: 2px solid #666;
          padding-bottom: 8px;
        }
        
        .response-note {
          font-size: 12px;
          color: #666;
          font-style: italic;
          margin-top: 15px;
        }
        
        /* Button that converts to readable link */
        .button-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border: 2px solid #333;
        }
        
        .button {
          display: inline-block;
          background: #333;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border: 2px solid #333;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 10px 0;
        }
        
        .button:hover {
          background: #555;
          border-color: #555;
        }
        
        /* Footer with clear text formatting */
        .footer {
          border-top: 3px solid #333;
          padding: 20px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .footer-text {
          margin-bottom: 8px;
        }
        
        /* Separator lines for text conversion */
        .separator {
          border-top: 1px solid #ccc;
          margin: 20px 0;
          height: 1px;
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 600px) {
          .info-table {
            font-size: 12px;
          }
          
          .info-table td {
            padding: 8px;
          }
          
          .content {
            padding: 15px;
          }
        }
        
        /* Text-only fallbacks */
        @media screen and (max-width: 0) {
          .info-table, .content-section, .response-section, .button-section {
            border: none !important;
            padding: 10px 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header Section -->
        <div class="header">
          <h1 class="header-title">Request for Information</h1>
          <h2 class="header-subtitle">RFI# ${rfi.rfiNumber}</h2>
        </div>
        
        <div class="content">
          <!-- RFI and Project Information Table -->
          <table class="info-table">
            <tr>
              <td class="section-header" colspan="2">RFI DETAILS</td>
            </tr>
            <tr>
              <td style="width: 50%;">
                <div class="info-row">
                  <span class="info-label">RFI Number:</span>
                  <span class="info-value">${rfi.rfiNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Title:</span>
                  <span class="info-value">${rfi.title}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">
                    <span class="status-badge" style="background: ${getStatusColor(rfi.status)}20; color: ${getStatusColor(rfi.status)}; border: 1px solid ${getStatusColor(rfi.status)};">
                      ${rfi.status.replace('_', ' ')}
                    </span>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Priority:</span>
                  <span class="info-value">
                    <span class="priority-badge" style="background: ${getPriorityColor(rfi.priority)}20; color: ${getPriorityColor(rfi.priority)}; border: 1px solid ${getPriorityColor(rfi.priority)};">
                      ${rfi.priority}
                    </span>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Urgency:</span>
                  <span class="info-value">${rfi.urgency}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Direction:</span>
                  <span class="info-value">${rfi.direction === 'OUTGOING' ? 'Outgoing (To Client)' : 'Incoming (From Client)'}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Created By:</span>
                  <span class="info-value">${rfi.createdBy.name}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Date Created:</span>
                  <span class="info-value">${format(new Date(rfi.createdAt), 'MMM d, yyyy')}</span>
                </div>
                
                ${rfi.dateNeededBy ? `
                <div class="info-row">
                  <span class="info-label">Date Needed By:</span>
                  <span class="info-value">${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}</span>
                </div>
                ` : ''}
              </td>
              
              <td style="width: 50%;">
                <div class="info-row">
                  <span class="info-label">Project:</span>
                  <span class="info-value">${rfi.project.name}</span>
                </div>
                
                ${rfi.project.projectNumber ? `
                <div class="info-row">
                  <span class="info-label">Project Number:</span>
                  <span class="info-value">${rfi.project.projectNumber}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                  <span class="info-label">Client:</span>
                  <span class="info-value">${rfi.client.name}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${rfi.client.contactName}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${rfi.client.email}</span>
                </div>
                
                ${rfi.client.phone ? `
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">${rfi.client.phone}</span>
                </div>
                ` : ''}
              </td>
            </tr>
          </table>
          
          <!-- Description Section -->
          <div class="content-section">
            <h3 class="section-title">DESCRIPTION</h3>
            <div class="section-content">${rfi.description}</div>
          </div>
          
          <!-- Suggested Solution Section -->
          ${rfi.suggestedSolution ? `
          <div class="content-section">
            <h3 class="section-title">SUGGESTED SOLUTION</h3>
            <div class="section-content">${rfi.suggestedSolution}</div>
          </div>
          ` : ''}
          
          <!-- Response Section -->
          <div class="response-section">
            <h3 class="response-title">RESPONSE</h3>
            <p>This section can be used for written responses when printed.</p>
            <div style="border-top: 1px solid #ccc; margin: 20px 0; padding-top: 20px; min-height: 60px;"></div>
            <p class="response-note">This section can be used for written responses when printed.</p>
          </div>
          
          <!-- Action Button Section -->
          <div class="button-section">
            ${recipientData && !recipientData.isRegistered && recipientData.registrationToken ? `
            <p><strong>Create your account to view and respond to this RFI:</strong></p>
            <a href="${appConfig.url}/register?token=${recipientData.registrationToken}" class="button" style="background: #10b981; color: white; margin-bottom: 20px;">
              Create Your Account
            </a>
            <p style="margin-top: 10px; margin-bottom: 20px; font-size: 14px; color: #10b981;">
              You've been added as a stakeholder on this project. Click above to create your account and access the RFI system.
            </p>
            ` : ''}
            <p><strong>View this RFI online:</strong></p>
            <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
              View RFI Online
            </a>
            <p style="margin-top: 10px; font-size: 12px;">
              Link: ${appConfig.url}/dashboard/rfis/${rfi.id}
            </p>
            ${recipientData && !recipientData.isRegistered && !recipientData.registrationToken ? `
            <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px;">
              <strong style="color: #d97706;">Note:</strong> If you received this email as a forward, you can request access to view and respond to RFIs by visiting:
              <br><a href="${appConfig.url}/request-access" style="color: #f59e0b; text-decoration: underline;">${appConfig.url}/request-access</a>
            </p>
            ` : ''}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div class="footer-text">💬 You can reply to this email to respond to this RFI</div>
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
${recipientData && !recipientData.isRegistered && recipientData.registrationToken ? `

Create Your Account: ${appConfig.url}/register?token=${recipientData.registrationToken}
You've been added as a stakeholder on this project. Visit the link above to create your account.
` : ''}
${recipientData && !recipientData.isRegistered && !recipientData.registrationToken ? `

Request Access: ${appConfig.url}/request-access
If you received this email as a forward, you can request access to the RFI system.
` : ''}

---
This email was sent from ${appConfig.name}
💬 You can reply to this email to respond to this RFI
  `.trim()
  
  return { subject, html, text }
}

export function generateRFIResponseEmail(
  rfi: RFI & { client: Client, project: Project },
  response: { content: string; author: User; createdAt: string },
  recipientData?: { 
    email: string, 
    isRegistered: boolean, 
    registrationToken?: string 
  }
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
        /* CSS Reset and Base Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 14px;
          padding: 20px;
        }
        
        /* Container and Layout */
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #10b981;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #10b981;
          padding: 20px;
          background: #10b981;
          color: white;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 18px;
          font-weight: 600;
        }
        
        .content {
          padding: 20px;
        }
        
        /* Text-friendly project info table */
        .project-info {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border: 2px solid #333;
        }
        
        .project-info td {
          padding: 12px;
          border: 1px solid #666;
          vertical-align: top;
        }
        
        .section-header {
          background: #f8f9fa;
          font-weight: 700;
          font-size: 16px;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          border-bottom: 2px solid #333;
        }
        
        .info-row {
          margin-bottom: 12px;
        }
        
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          display: block;
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 500;
          display: block;
        }
        
        /* Response section with clear formatting */
        .response-section {
          border: 2px solid #10b981;
          padding: 20px;
          margin: 30px 0;
          background: #f0fdf4;
        }
        
        .response-header {
          font-size: 18px;
          font-weight: 700;
          color: #065f46;
          text-transform: uppercase;
          border-bottom: 2px solid #10b981;
          padding-bottom: 8px;
          margin-bottom: 15px;
          letter-spacing: 0.5px;
        }
        
        .response-meta {
          font-size: 14px;
          color: #065f46;
          margin-bottom: 15px;
          font-weight: 600;
          border-bottom: 1px solid #10b981;
          padding-bottom: 8px;
        }
        
        .response-content {
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: #1a1a1a;
        }
        
        /* Button section with clear text alternative */
        .button-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border: 2px solid #10b981;
        }
        
        .button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border: 2px solid #10b981;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 10px 0;
        }
        
        .button:hover {
          background: #059669;
          border-color: #059669;
        }
        
        /* Footer with clear text formatting */
        .footer {
          border-top: 3px solid #333;
          padding: 20px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .footer-text {
          margin-bottom: 8px;
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 600px) {
          .project-info {
            font-size: 12px;
          }
          
          .project-info td {
            padding: 8px;
          }
          
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header Section -->
        <div class="header">
          <h1 class="header-title">RFI Response Received</h1>
          <h2 class="header-subtitle">RFI# ${rfi.rfiNumber}</h2>
        </div>
        
        <div class="content">
          <!-- Project Information Table -->
          <table class="project-info">
            <tr>
              <td class="section-header" colspan="2">PROJECT INFORMATION</td>
            </tr>
            <tr>
              <td style="width: 100%;">
                <div class="info-row">
                  <span class="info-label">RFI Title:</span>
                  <span class="info-value">${rfi.title}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Project:</span>
                  <span class="info-value">${rfi.project.name}</span>
                </div>
                
                ${rfi.project.projectNumber ? `
                <div class="info-row">
                  <span class="info-label">Project Number:</span>
                  <span class="info-value">${rfi.project.projectNumber}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                  <span class="info-label">Client:</span>
                  <span class="info-value">${rfi.client.name}</span>
                </div>
              </td>
            </tr>
          </table>
          
          <!-- Response Section -->
          <div class="response-section">
            <h3 class="response-header">RESPONSE DETAILS</h3>
            <div class="response-meta">
              <strong>From:</strong> ${response.author.name}<br>
              <strong>Date:</strong> ${format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
            <div class="response-content">${response.content}</div>
          </div>
          
          <!-- Action Button Section -->
          <div class="button-section">
            ${recipientData && !recipientData.isRegistered && recipientData.registrationToken ? `
            <p><strong>Create your account to view and respond to this RFI:</strong></p>
            <a href="${appConfig.url}/register?token=${recipientData.registrationToken}" class="button" style="background: #10b981; color: white; margin-bottom: 20px;">
              Create Your Account
            </a>
            <p style="margin-top: 10px; margin-bottom: 20px; font-size: 14px; color: #10b981;">
              You've been added as a stakeholder on this project. Click above to create your account and access the RFI system.
            </p>
            ` : ''}
            <p><strong>View the full RFI online:</strong></p>
            <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
              View Full RFI
            </a>
            <p style="margin-top: 10px; font-size: 12px;">
              Link: ${appConfig.url}/dashboard/rfis/${rfi.id}
            </p>
            ${recipientData && !recipientData.isRegistered && !recipientData.registrationToken ? `
            <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px;">
              <strong style="color: #d97706;">Note:</strong> If you received this email as a forward, you can request access to view and respond to RFIs by visiting:
              <br><a href="${appConfig.url}/request-access" style="color: #f59e0b; text-decoration: underline;">${appConfig.url}/request-access</a>
            </p>
            ` : ''}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div class="footer-text">💬 You can reply to this email to respond to this RFI</div>
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
${recipientData && !recipientData.isRegistered && recipientData.registrationToken ? `

Create Your Account: ${appConfig.url}/register?token=${recipientData.registrationToken}
You've been added as a stakeholder on this project. Visit the link above to create your account.
` : ''}
${recipientData && !recipientData.isRegistered && !recipientData.registrationToken ? `

Request Access: ${appConfig.url}/request-access
If you received this email as a forward, you can request access to the RFI system.
` : ''}

---
This email was sent from ${appConfig.name}
💬 You can reply to this email to respond to this RFI
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
  // Process recipients to check registration status and create tokens
  const recipientDataMap = new Map<string, { email: string, isRegistered: boolean, registrationToken?: string }>()
  
  for (const recipientEmail of recipients) {
    try {
      // Check if recipient is a contact in the system
      const contact = await prisma.contact.findFirst({
        where: { email: recipientEmail }
      })
      
      if (contact) {
        // Contact exists in system
        const isRegistered = !!contact.password
        let registrationToken: string | undefined
        
        // If not registered and is eligible for registration, create a token
        if (!isRegistered && contact.registrationEligible) {
          const status = await getContactRegistrationStatus(contact.id)
          
          // Create new token if none exists
          if (!status?.hasValidToken) {
            const token = await createRegistrationToken({
              email: contact.email,
              contactId: contact.id,
              projectIds: [rfi.project.id],
              tokenType: 'AUTO_APPROVED',
              expiresInDays: 30
            })
            registrationToken = token.token
          } else {
            registrationToken = status.latestToken || undefined
          }
        }
        
        recipientDataMap.set(recipientEmail, {
          email: recipientEmail,
          isRegistered,
          registrationToken
        })
      } else {
        // Not a contact - they'll need to request access
        recipientDataMap.set(recipientEmail, {
          email: recipientEmail,
          isRegistered: false,
          registrationToken: undefined
        })
      }
    } catch (error) {
      console.error(`Error processing recipient ${recipientEmail}:`, error)
      // Continue with basic data if error occurs
      recipientDataMap.set(recipientEmail, {
        email: recipientEmail,
        isRegistered: false,
        registrationToken: undefined
      })
    }
  }
  
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
  
  // Send personalized emails to each recipient
  const { sendEmailWithProvider } = await import('./email-providers')
  const failedRecipients: string[] = []
  let successCount = 0
  
  for (const recipient of recipients) {
    try {
      const recipientData = recipientDataMap.get(recipient)
      const emailTemplate = generateRFICreatedEmail(rfi, recipientData)
      
      const result = await sendEmailWithProvider({
        to: [recipient],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments: attachments.length > 0 ? attachments : undefined,
        rfiId: rfi.id // Add RFI ID for reply-to functionality
      })
      
      if (result.success) {
        successCount++
      } else {
        failedRecipients.push(recipient)
      }
    } catch (error) {
      console.error(`Failed to send email to ${recipient}:`, error)
      failedRecipients.push(recipient)
    }
  }
  
  if (successCount === 0) {
    return { success: false, error: 'Failed to send email to any recipients' }
  } else if (failedRecipients.length > 0) {
    return { 
      success: true, 
      error: `Email sent to ${successCount} recipients, but failed for: ${failedRecipients.join(', ')}` 
    }
  } else {
    return { success: true }
  }
}

export async function sendRFIResponseNotificationEmails(
  rfi: RFI & { client: Client, project: Project },
  response: { content: string; author: User; createdAt: string },
  recipients: string[],
  includePDFAttachment: boolean = false
): Promise<{ success: boolean; error?: string }> {
  // Process recipients to check registration status and create tokens
  const recipientDataMap = new Map<string, { email: string, isRegistered: boolean, registrationToken?: string }>()
  
  for (const recipientEmail of recipients) {
    try {
      // Check if recipient is a contact in the system
      const contact = await prisma.contact.findFirst({
        where: { email: recipientEmail }
      })
      
      if (contact) {
        // Contact exists in system
        const isRegistered = !!contact.password
        let registrationToken: string | undefined
        
        // If not registered and is eligible for registration, create a token
        if (!isRegistered && contact.registrationEligible) {
          const status = await getContactRegistrationStatus(contact.id)
          
          // Create new token if none exists
          if (!status?.hasValidToken) {
            const token = await createRegistrationToken({
              email: contact.email,
              contactId: contact.id,
              projectIds: [rfi.project.id],
              tokenType: 'AUTO_APPROVED',
              expiresInDays: 30
            })
            registrationToken = token.token
          } else {
            registrationToken = status.latestToken || undefined
          }
        }
        
        recipientDataMap.set(recipientEmail, {
          email: recipientEmail,
          isRegistered,
          registrationToken
        })
      } else {
        // Not a contact - they'll need to request access
        recipientDataMap.set(recipientEmail, {
          email: recipientEmail,
          isRegistered: false,
          registrationToken: undefined
        })
      }
    } catch (error) {
      console.error(`Error processing recipient ${recipientEmail}:`, error)
      // Continue with basic data if error occurs
      recipientDataMap.set(recipientEmail, {
        email: recipientEmail,
        isRegistered: false,
        registrationToken: undefined
      })
    }
  }
  
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
  
  // Send personalized emails to each recipient
  const { sendEmailWithProvider } = await import('./email-providers')
  const failedRecipients: string[] = []
  let successCount = 0
  
  for (const recipient of recipients) {
    try {
      const recipientData = recipientDataMap.get(recipient)
      const emailTemplate = generateRFIResponseEmail(rfi, response, recipientData)
      
      const result = await sendEmailWithProvider({
        to: [recipient],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments,
        rfiId: rfi.id // Add RFI ID for reply-to functionality
      })
      
      if (result.success) {
        successCount++
      } else {
        failedRecipients.push(recipient)
      }
    } catch (error) {
      console.error(`Failed to send response email to ${recipient}:`, error)
      failedRecipients.push(recipient)
    }
  }
  
  if (successCount === 0) {
    return { success: false, error: 'Failed to send email to any recipients' }
  } else if (failedRecipients.length > 0) {
    return { 
      success: true, 
      error: `Email sent to ${successCount} recipients, but failed for: ${failedRecipients.join(', ')}` 
    }
  } else {
    return { success: true }
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
          border: 2px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
          padding: 20px;
          background: ${isOverdue ? '#dc2626' : '#f59e0b'};
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
          background: ${isOverdue ? '#fef9f9' : '#fefbf2'};
          border-bottom: 2px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
          text-align: center;
        }
        
        .alert-text {
          font-size: 16px;
          font-weight: 600;
          color: ${isOverdue ? '#991b1b' : '#d97706'};
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
        
        /* Text-friendly table layout - converts well to plain text */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border: 2px solid #333;
        }
        
        .info-table td {
          padding: 12px;
          border: 1px solid #666;
          vertical-align: top;
        }
        
        .info-table .section-header {
          background: #f8f9fa;
          font-weight: 700;
          font-size: 16px;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          border-bottom: 2px solid #333;
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
        
        .info-row {
          margin-bottom: 12px;
        }
        
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          display: block;
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 500;
          display: block;
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
          border: 2px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
          padding: 20px;
          margin: 20px 0;
          background: ${isOverdue ? '#fef9f9' : '#fefbf2'};
          text-align: center;
        }
        
        .action-text {
          font-size: 14px;
          font-weight: 600;
          color: ${isOverdue ? '#991b1b' : '#d97706'};
          margin-bottom: 15px;
        }
        
        /* Footer with clear text formatting */
        .footer {
          border-top: 3px solid #333;
          padding: 20px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .footer-text {
          margin-bottom: 8px;
        }
        
        .button {
          display: inline-block;
          background: ${isOverdue ? '#dc2626' : '#f59e0b'};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border: 2px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 15px 0;
        }
        
        .button:hover {
          background: ${isOverdue ? '#991b1b' : '#d97706'};
          border-color: ${isOverdue ? '#991b1b' : '#d97706'};
        }
        
        /* Button section with clear text alternative */
        .button-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border: 2px solid ${isOverdue ? '#dc2626' : '#f59e0b'};
        }
        
        .button-container {
          text-align: center;
          margin: 20px 0;
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 600px) {
          .info-table {
            font-size: 12px;
          }
          
          .info-table td {
            padding: 8px;
          }
          
          .content {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-title">${isOverdue ? 'RFI Reminder - Overdue' : 'RFI Reminder - Due Tomorrow'}</div>
          <div class="header-subtitle">RFI# ${rfi.rfiNumber}</div>
        </div>
        
        <div class="alert-section">
          <div class="alert-text">
            ${isOverdue ? `This RFI is ${daysOverdue} ${daysSuffix} overdue` : 'This RFI is due tomorrow'}
          </div>
          <div class="alert-details">
            ${rfi.dateNeededBy ? `Response needed by: ${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}` : 'Please respond as soon as possible'}
          </div>
        </div>
        
        <div class="content">
          <!-- RFI and Project Information Table -->
          <table class="info-table">
            <tr>
              <td class="section-header" colspan="2">RFI REMINDER DETAILS</td>
            </tr>
            <tr>
              <td style="width: 50%;">
                <div class="info-row">
                  <span class="info-label">RFI Number:</span>
                  <span class="info-value">${rfi.rfiNumber}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Title:</span>
                  <span class="info-value">${rfi.title}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">
                    <span class="status-badge" style="background: ${getStatusColor(rfi.status)}20; color: ${getStatusColor(rfi.status)}; border: 1px solid ${getStatusColor(rfi.status)};">
                      ${rfi.status.replace('_', ' ')}
                    </span>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Priority:</span>
                  <span class="info-value">
                    <span class="priority-badge" style="background: ${getPriorityColor(rfi.priority)}20; color: ${getPriorityColor(rfi.priority)}; border: 1px solid ${getPriorityColor(rfi.priority)};">
                      ${rfi.priority}
                    </span>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Created By:</span>
                  <span class="info-value">${rfi.createdBy.name}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Date Created:</span>
                  <span class="info-value">${format(new Date(rfi.createdAt), 'MMM d, yyyy')}</span>
                </div>
                
                ${rfi.dateNeededBy ? `
                <div class="info-row">
                  <span class="info-label">Date Needed By:</span>
                  <span class="info-value">${format(new Date(rfi.dateNeededBy), 'MMM d, yyyy')}</span>
                </div>
                ` : ''}
              </td>
              
              <td style="width: 50%;">
                <div class="info-row">
                  <span class="info-label">Project:</span>
                  <span class="info-value">${rfi.project.name}</span>
                </div>
                
                ${rfi.project.projectNumber ? `
                <div class="info-row">
                  <span class="info-label">Project Number:</span>
                  <span class="info-value">${rfi.project.projectNumber}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                  <span class="info-label">Client:</span>
                  <span class="info-value">${rfi.client.name}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${rfi.client.contactName}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${rfi.client.email}</span>
                </div>
              </td>
            </tr>
          </table>
          
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
                ? 'Please provide your response as soon as possible to avoid project delays.'
                : 'Please provide your response by tomorrow to keep the project on schedule.'
              }
            </div>
            
            <div class="button-container">
              <p><strong>View and respond to this RFI online:</strong></p>
              <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
                ${isOverdue ? 'View & Respond' : 'View & Respond'}
              </a>
              <p style="margin-top: 10px; font-size: 12px;">
                Link: ${appConfig.url}/dashboard/rfis/${rfi.id}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div class="footer-text">This is an automated reminder. Please respond to avoid project delays.</div>
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
  
  // Generate PDF attachment
  let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []
  try {
    const { generateRFIPDF } = await import('./pdf')
    const pdfResult = await generateRFIPDF(rfi as any)
    attachments = [{
      filename: pdfResult.filename,
      content: pdfResult.buffer,
      contentType: pdfResult.contentType
    }]
    console.log(`📎 PDF attachment generated: ${pdfResult.filename}`)
  } catch (pdfError) {
    console.warn('Failed to generate PDF attachment for reminder:', pdfError)
    // Continue sending email without attachment
  }
  
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to: stakeholderEmails,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      rfiId: rfi.id, // Add RFI ID for reply-to functionality
      attachments
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to: stakeholderEmails,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments
    })
  }
}

// Access request approval email template
export function generateAccessRequestApprovalEmail(
  contact: { name: string; email: string },
  project: { name: string; projectNumber?: string | null },
  client: { name: string },
  registrationToken: string
): { subject: string; html: string; text: string } {
  const subject = `Access Approved - Welcome to ${project.name}`
  
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
          line-height: 1.6;
          color: #1a1a1a;
          background: #f5f5f5;
          font-size: 14px;
          padding: 20px;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #10b981;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #10b981;
          padding: 30px 20px;
          background: #10b981;
          color: white;
        }
        
        .header-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header-subtitle {
          font-size: 16px;
          font-weight: 400;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .welcome-section {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .welcome-title {
          font-size: 24px;
          font-weight: 700;
          color: #10b981;
          margin-bottom: 10px;
        }
        
        .welcome-text {
          font-size: 16px;
          color: #374151;
          line-height: 1.6;
        }
        
        .project-info {
          background: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        
        .project-header {
          font-size: 18px;
          font-weight: 700;
          color: #065f46;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #bbf7d0;
        }
        
        .info-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .info-label {
          font-weight: 600;
          color: #065f46;
        }
        
        .info-value {
          color: #1f2937;
        }
        
        .action-section {
          background: #fefdf2;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 25px;
          margin: 30px 0;
          text-align: center;
        }
        
        .action-title {
          font-size: 20px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 15px;
        }
        
        .action-text {
          font-size: 16px;
          color: #78350f;
          margin-bottom: 25px;
          line-height: 1.6;
        }
        
        .button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 10px 0;
          box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
          transition: all 0.3s ease;
        }
        
        .button:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
        }
        
        .next-steps {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        
        .next-steps-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 15px;
        }
        
        .step-list {
          list-style: none;
          padding: 0;
        }
        
        .step-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
          font-size: 14px;
          color: #475569;
        }
        
        .step-number {
          background: #10b981;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .footer {
          border-top: 3px solid #10b981;
          padding: 20px;
          background: #f8fafc;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        
        .footer-text {
          margin-bottom: 8px;
        }
        
        @media (max-width: 600px) {
          .content {
            padding: 20px;
          }
          
          .info-row {
            flex-direction: column;
          }
          
          .info-label {
            margin-bottom: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-title">Access Approved!</div>
          <div class="header-subtitle">Welcome to the RFI System</div>
        </div>
        
        <div class="content">
          <div class="welcome-section">
            <div class="welcome-title">Hello ${contact.name}!</div>
            <div class="welcome-text">
              Your access request has been approved. You now have access to view and respond to RFI documents for this project.
            </div>
          </div>
          
          <div class="project-info">
            <div class="project-header">Project Access Granted</div>
            <div class="info-row">
              <span class="info-label">Project Name:</span>
              <span class="info-value">${project.name}</span>
            </div>
            ${project.projectNumber ? `
            <div class="info-row">
              <span class="info-label">Project Number:</span>
              <span class="info-value">${project.projectNumber}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Client:</span>
              <span class="info-value">${client.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Your Role:</span>
              <span class="info-value">Project Stakeholder</span>
            </div>
          </div>
          
          <div class="action-section">
            <div class="action-title">Create Your Account</div>
            <div class="action-text">
              Click the button below to create your account and start accessing RFI documents. This link will expire in 30 days.
            </div>
            <a href="${appConfig.url}/register?token=${registrationToken}" class="button">
              Create Your Account
            </a>
          </div>
          
          <div class="next-steps">
            <div class="next-steps-title">What's Next?</div>
            <ul class="step-list">
              <li class="step-item">
                <span class="step-number">1</span>
                <span>Click "Create Your Account" above to set up your login credentials</span>
              </li>
              <li class="step-item">
                <span class="step-number">2</span>
                <span>Complete the registration form with a secure password</span>
              </li>
              <li class="step-item">
                <span class="step-number">3</span>
                <span>Access your project dashboard to view and respond to RFIs</span>
              </li>
              <li class="step-item">
                <span class="step-number">4</span>
                <span>Use the reply-to-email feature to respond directly from your inbox</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text">Welcome to the ${appConfig.name}!</div>
          <div class="footer-text">If you have any questions, please contact your project administrator.</div>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
ACCESS APPROVED - Welcome to ${project.name}

Hello ${contact.name}!

Your access request has been approved. You now have access to view and respond to RFI documents for this project.

PROJECT ACCESS GRANTED:
- Project Name: ${project.name}
${project.projectNumber ? `- Project Number: ${project.projectNumber}` : ''}
- Client: ${client.name}
- Your Role: Project Stakeholder

NEXT STEPS:
1. Create your account: ${appConfig.url}/register?token=${registrationToken}
2. Complete the registration form with a secure password
3. Access your project dashboard to view and respond to RFIs
4. Use the reply-to-email feature to respond directly from your inbox

This registration link will expire in 30 days.

Welcome to the ${appConfig.name}!
If you have any questions, please contact your project administrator.
  `.trim()
  
  return { subject, html, text }
}

// Send access request approval email
export async function sendAccessRequestApprovalEmail(
  contact: { name: string; email: string },
  project: { name: string; projectNumber?: string | null },
  client: { name: string },
  registrationToken: string
): Promise<{ success: boolean; error?: string }> {
  const emailTemplate = generateAccessRequestApprovalEmail(contact, project, client, registrationToken)
  
  console.log(`📧 Sending access approval email to ${contact.email} for project ${project.name}`)
  
  // Try using configured email provider first, fall back to SMTP
  try {
    const { sendEmailWithProvider } = await import('./email-providers')
    return await sendEmailWithProvider({
      to: contact.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    })
  } catch (error) {
    console.warn('Failed to send with configured provider, falling back to SMTP:', error)
    // Fall back to original SMTP method
    return await sendEmail({
      to: contact.email,
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