import { RFI, User, Client, Project } from '@/types'
import { format } from 'date-fns'
import { brevoClient, generateReplyToEmail } from './brevo'
import { appConfig } from './env'

// Enhanced email template that supports reply-to functionality
export function generateRFICreatedEmailWithReply(rfi: RFI & { 
  client: Client, 
  project: Project, 
  createdBy: User 
}): { subject: string; html: string; text: string; replyTo: string } {
  
  const replyToEmail = generateReplyToEmail(rfi.id)
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

        .reply-notice {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 15px;
          text-align: center;
          border-bottom: 2px solid #333;
        }

        .reply-notice-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .reply-notice-text {
          font-size: 12px;
          line-height: 1.4;
        }

        .reply-notice-email {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 12px;
          margin: 8px 0 4px 0;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-weight: 600;
          font-size: 11px;
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
          border: 2px solid #10b981;
          padding: 15px;
          margin: 20px 0;
          background: #f0fdf4;
        }
        
        .response-label {
          font-size: 14px;
          font-weight: 700;
          color: #065f46;
          text-transform: uppercase;
          border-bottom: 1px solid #10b981;
          padding-bottom: 4px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .response-note {
          font-size: 11px;
          color: #065f46;
          font-style: italic;
          margin-top: 8px;
          line-height: 1.4;
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

        <div class="reply-notice">
          <div class="reply-notice-title">💬 Quick Reply Available</div>
          <div class="reply-notice-text">
            You can respond to this RFI by simply replying to this email.
            <div class="reply-notice-email">${replyToEmail}</div>
            Your response will be automatically added to the RFI system.
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
            <div class="response-label">📧 Email Response Instructions</div>
            <div class="response-note">
              <strong>Option 1:</strong> Reply directly to this email and your response will be automatically recorded in the RFI system.<br><br>
              <strong>Option 2:</strong> Click the button below to respond online with additional features like file attachments.
            </div>
          </div>
          
          <div class="button-container">
            <a href="${appConfig.url}/dashboard/rfis/${rfi.id}" class="button">
              View RFI Online
            </a>
          </div>
        </div>
        
        <div class="footer-info">
          <div>Generated by ${appConfig.name} on ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div style="margin-top: 5px;">💡 <strong>Pro Tip:</strong> Reply to this email to respond instantly!</div>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
New RFI Created: ${rfi.rfiNumber} - ${rfi.title}

💬 QUICK REPLY: You can respond by replying to this email!
Your response will be automatically added to the RFI system.

Project: ${rfi.project.name}
Client: ${rfi.client.name}
Status: ${rfi.status}
Priority: ${rfi.priority}
Created By: ${rfi.createdBy.name}
Created Date: ${format(new Date(rfi.createdAt), 'MMM d, yyyy h:mm a')}

Description:
${rfi.description}

${rfi.suggestedSolution ? `Suggested Solution:\n${rfi.suggestedSolution}\n\n` : ''}

📧 RESPONSE OPTIONS:
1. Reply directly to this email (easiest)
2. View online: ${appConfig.url}/dashboard/rfis/${rfi.id}

---
This email was sent from ${appConfig.name}
Reply to this email to respond to the RFI!
  `.trim()
  
  return { subject, html, text, replyTo: replyToEmail }
}

// Send RFI notification using Brevo with reply-to capability
export async function sendRFINotificationWithReply(
  rfi: RFI & { client: Client, project: Project, createdBy: User },
  recipients: string[],
  options: {
    includePDF?: boolean
    includeAttachments?: boolean
  } = {}
): Promise<{ success: boolean; error?: string; replyToEmail?: string }> {
  
  try {
    const emailTemplate = generateRFICreatedEmailWithReply(rfi)
    
    // Check if we can send (respects free tier limits)
    const canSend = await brevoClient.checkDailyLimit()
    if (!canSend) {
      return { 
        success: false, 
        error: 'Daily email limit reached. Email queued for tomorrow.' 
      }
    }

    const result = await brevoClient.sendEmail({
      to: recipients.map(email => ({ email, name: undefined })),
      subject: emailTemplate.subject,
      htmlContent: emailTemplate.html,
      textContent: emailTemplate.text,
      replyTo: { 
        email: emailTemplate.replyTo,
        name: 'RFI System - Reply Here'
      },
      sender: {
        email: 'noreply@steel-detailer.com',
        name: 'Steel RFI System'
      }
    })

    console.log('✅ RFI notification sent via Brevo:', {
      rfiNumber: rfi.rfiNumber,
      recipients: recipients.length,
      replyTo: emailTemplate.replyTo,
      messageId: result
    })

    return { 
      success: true, 
      replyToEmail: emailTemplate.replyTo 
    }

  } catch (error: any) {
    console.error('❌ Failed to send RFI notification via Brevo:', error)
    
    if (error.message?.includes('Daily email limit reached')) {
      return { 
        success: false, 
        error: 'Daily email limit reached. Please try again tomorrow or upgrade your plan.' 
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send email notification' 
    }
  }
}

// Helper functions for colors (same as original email.ts)
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

// Enhanced email service that intelligently chooses between Brevo and fallback
export async function sendRFIEmailSmart(
  rfi: RFI & { client: Client, project: Project, createdBy: User },
  recipients: string[]
): Promise<{ success: boolean; error?: string; replyToEmail?: string; method?: string }> {
  
  // Try Brevo first (with reply-to capability)
  try {
    const brevoResult = await sendRFINotificationWithReply(rfi, recipients)
    if (brevoResult.success) {
      return { 
        ...brevoResult, 
        method: 'brevo' 
      }
    }
    
    // If Brevo failed due to limits, we could queue or use fallback
    console.log('Brevo failed, reason:', brevoResult.error)
    
  } catch (error) {
    console.error('Brevo completely failed:', error)
  }

  // Fallback to original email system (no reply-to capability)
  try {
    const { sendRFINotificationEmails } = await import('./email')
    const fallbackResult = await sendRFINotificationEmails(rfi, recipients, false, false)
    
    return {
      ...fallbackResult,
      method: 'fallback',
      replyToEmail: undefined
    }
    
  } catch (error) {
    return {
      success: false,
      error: 'Both Brevo and fallback email systems failed',
      method: 'none'
    }
  }
}