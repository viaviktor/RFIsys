import puppeteer from 'puppeteer'
import { RFI, Client, Project, User, Attachment } from '@/types'
import { format } from 'date-fns'

export interface RFIPDFData {
  id: string
  rfiNumber: string
  title: string
  description: string
  suggestedSolution?: string
  status: string
  priority: string
  category: string
  direction: string
  urgency: string
  dateNeededBy?: string
  createdAt: string
  client: Client
  project: Project
  createdBy: User
  attachments?: (Attachment & { data?: string })[]
  responses?: Array<{
    id: string
    content: string
    createdAt: string
    author: User
  }>
}

const generateRFIHTML = (rfi: RFIPDFData): string => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy')
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy h:mm a')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return '#f59e0b'
      case 'IN_PROGRESS': return '#3b82f6'
      case 'CLOSED': return '#10b981'
      case 'CANCELLED': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return '#10b981'
      case 'MEDIUM': return '#f59e0b'
      case 'HIGH': return '#f97316'
      case 'URGENT': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RFI ${rfi.rfiNumber} - ${rfi.title}</title>
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
          background: #ffffff;
          font-size: 12px;
        }
        
        .container {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
          min-height: 9.7in;
          border: 2px solid #333;
          position: relative;
          box-sizing: border-box;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #333;
          padding-bottom: 12px;
          margin-bottom: 20px;
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
        
        .top-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
        }
        
        .rfi-details {
          flex: 1;
          border: 2px solid #333;
          padding: 12px;
        }
        
        .project-info {
          flex: 1;
          border: 2px solid #333;
          padding: 12px;
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
          display: flex;
          margin-bottom: 6px;
          align-items: baseline;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #333;
          width: 80px;
          flex-shrink: 0;
        }
        
        .detail-value {
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
          flex: 1;
        }
        
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .priority-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .content-section {
          border: 2px solid #333;
          margin-bottom: 15px;
          padding: 12px;
          page-break-inside: avoid;
        }
        
        .content-header {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          padding-bottom: 4px;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        
        .content-text {
          font-size: 12px;
          line-height: 1.5;
          color: #1a1a1a;
          white-space: pre-wrap;
          min-height: 60px;
        }
        
        .response-section {
          border: 2px solid #333;
          padding: 12px;
          min-height: 200px;
          margin-bottom: 15px;
        }
        
        .response-area {
          border: 1px dashed #666;
          padding: 8px;
          min-height: 150px;
          background: #fafafa;
          margin-top: 8px;
        }
        
        .response-instructions {
          font-size: 10px;
          color: #666;
          font-style: italic;
          margin-bottom: 8px;
        }
        
        .existing-responses {
          margin-top: 12px;
        }
        
        .response-item {
          border: 1px solid #ccc;
          padding: 8px;
          margin-bottom: 8px;
          background: #f9f9f9;
        }
        
        .response-meta {
          font-size: 10px;
          color: #666;
          margin-bottom: 4px;
          font-weight: 600;
        }
        
        .response-content {
          font-size: 11px;
          line-height: 1.4;
          color: #1a1a1a;
          white-space: pre-wrap;
        }
        
        .attachments-section {
          border: 2px solid #333;
          padding: 12px;
          margin-bottom: 15px;
        }
        
        .attachment-item {
          display: flex;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px dotted #ccc;
          font-size: 11px;
        }
        
        .attachment-name {
          font-weight: 600;
          margin-right: 8px;
          flex: 1;
        }
        
        .attachment-size {
          font-size: 10px;
          color: #666;
          background: #f0f0f0;
          padding: 1px 6px;
          border-radius: 8px;
        }
        
        .footer {
          position: absolute;
          bottom: 0.5in;
          left: 0.5in;
          right: 0.5in;
          border-top: 1px solid #333;
          padding-top: 8px;
          font-size: 10px;
          color: #666;
          text-align: center;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          .container {
            border: none;
            padding: 0.4in;
            min-height: auto;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .response-section {
            break-inside: avoid;
          }
          
          .content-section {
            break-inside: avoid;
          }
          
          .footer {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-title">Request for Information</div>
          <div class="header-subtitle">RFI# ${rfi.rfiNumber}: ${rfi.title}</div>
        </div>

        <!-- Top Section: RFI Details (Left) and Project Info (Right) -->
        <div class="top-section">
          <!-- RFI Details (Left) -->
          <div class="rfi-details">
            <div class="section-header">RFI Details</div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge" style="background-color: ${getStatusColor(rfi.status)}20; color: ${getStatusColor(rfi.status)};">
                ${rfi.status.replace('_', ' ')}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Priority:</span>
              <span class="priority-badge" style="background-color: ${getPriorityColor(rfi.priority)}20; color: ${getPriorityColor(rfi.priority)};">
                ${rfi.priority}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Direction:</span>
              <span class="detail-value">${rfi.direction === 'OUTGOING' ? 'To Client' : 'From Client'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Urgency:</span>
              <span class="detail-value">${rfi.urgency}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Created By:</span>
              <span class="detail-value">${rfi.createdBy.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Created:</span>
              <span class="detail-value">${formatDate(rfi.createdAt)}</span>
            </div>
            ${rfi.dateNeededBy ? `
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${formatDate(rfi.dateNeededBy)}</span>
            </div>
            ` : ''}
          </div>

          <!-- Project Information (Right) -->
          <div class="project-info">
            <div class="section-header">Project Information</div>
            <div class="detail-row">
              <span class="detail-label">Project:</span>
              <span class="detail-value">${rfi.project.projectNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${rfi.project.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Client:</span>
              <span class="detail-value">${rfi.client.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Contact:</span>
              <span class="detail-value">${rfi.client.contactName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${rfi.client.email}</span>
            </div>
            ${rfi.client.phone ? `
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span class="detail-value">${rfi.client.phone}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Description Section -->
        <div class="content-section">
          <div class="content-header">Description</div>
          <div class="content-text">${rfi.description}</div>
        </div>

        ${rfi.suggestedSolution ? `
        <!-- Suggested Solution Section -->
        <div class="content-section">
          <div class="content-header">Suggested Solution</div>
          <div class="content-text">${rfi.suggestedSolution}</div>
        </div>
        ` : ''}

        ${rfi.attachments && rfi.attachments.length > 0 ? `
        <!-- Attachments Section -->
        <div class="attachments-section">
          <div class="section-header">Attachments</div>
          ${rfi.attachments.map(attachment => `
            <div class="attachment-item">
              <span class="attachment-name">${attachment.filename}</span>
              <span class="attachment-size">${formatFileSize(attachment.size)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${rfi.responses && rfi.responses.length > 0 ? `
        <!-- Existing Responses -->
        <div class="content-section">
          <div class="content-header">Existing Responses</div>
          <div class="existing-responses">
            ${rfi.responses.map(response => `
              <div class="response-item">
                <div class="response-meta">${response.author.name} - ${formatDateTime(response.createdAt)}</div>
                <div class="response-content">${response.content}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Response Section -->
        <div class="response-section">
          <div class="content-header">Response</div>
          <div class="response-instructions">
            Please provide your response below. Use additional sheets if necessary.
          </div>
          <div class="response-area">
            <!-- Space for handwritten response -->
          </div>
          <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 11px;">
            <div>
              <strong>Responded By:</strong> ___________________________
            </div>
            <div>
              <strong>Date:</strong> _______________
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Generated on ${formatDateTime(new Date().toISOString())} | RFI System</p>
        </div>
      </div>
      ${rfi.attachments?.filter(att => att.mimeType?.startsWith('image/') && att.data).map((attachment, index) => `\n      <!-- Image Attachment Page ${index + 2} -->\n      <div class=\"page-break\">\n        <div class=\"container\">\n          <div class=\"header\">\n            <div class=\"header-title\">Request for Information</div>\n            <div class=\"header-subtitle\">RFI# ${rfi.rfiNumber}: ${rfi.title} - Attachment ${index + 1}</div>\n          </div>\n          \n          <div class=\"content-section\">\n            <div class=\"content-header\">Attachment: ${attachment.filename}</div>\n            <div style=\"text-align: center; padding: 10px; page-break-inside: avoid;\">\n              <img src=\"data:${attachment.mimeType};base64,${attachment.data}\" \n                   style=\"max-width: 100%; max-height: 6.5in; border: 1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: block; margin: 0 auto;\" \n                   alt=\"${attachment.filename}\" />\n            </div>\n            <div style=\"font-size: 11px; color: #666; text-align: center; margin-top: 10px;\">\n              File: ${attachment.filename} | Size: ${formatFileSize(attachment.size)} | Type: ${attachment.mimeType}\n            </div>\n          </div>\n          \n          <div class=\"footer\">\n            <p>Generated on ${formatDateTime(new Date().toISOString())} | RFI System</p>\n          </div>\n        </div>\n      </div>\n      `).join('') || ''}\n    </body>
    </html>
  `
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Create a simple fallback text export when Puppeteer fails
function generateFallbackText(rfi: RFIPDFData): { buffer: Buffer; isText: true } {
  const content = `
REQUEST FOR INFORMATION

RFI Number: ${rfi.rfiNumber}
Title: ${rfi.title}
Status: ${rfi.status}
Priority: ${rfi.priority}

Project: ${rfi.project.name} (${rfi.project.projectNumber})
Client: ${rfi.client.name}
Contact: ${rfi.client.contactName}
Email: ${rfi.client.email}

Created By: ${rfi.createdBy.name}
Created Date: ${format(new Date(rfi.createdAt), 'MMMM d, yyyy h:mm a')}
${rfi.dateNeededBy ? `Response Needed By: ${format(new Date(rfi.dateNeededBy), 'MMMM d, yyyy')}` : ''}

DESCRIPTION:
${rfi.description}

${rfi.suggestedSolution ? `SUGGESTED SOLUTION:\n${rfi.suggestedSolution}\n\n` : ''}

${rfi.attachments && rfi.attachments.length > 0 ? `ATTACHMENTS:\n${rfi.attachments.map(a => `- ${a.filename} (${formatFileSize(a.size)})`).join('\n')}\n\n` : ''}

${rfi.responses && rfi.responses.length > 0 ? `RESPONSES:\n${rfi.responses.map(r => `\n${r.author.name} - ${format(new Date(r.createdAt), 'MMMM d, yyyy h:mm a')}:\n${r.content}`).join('\n\n')}\n\n` : ''}

Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')} | RFI System
  `.trim()

  return {
    buffer: Buffer.from(content, 'utf-8'),
    isText: true
  }
}

export type PDFResult = {
  buffer: Buffer
  isPDF: boolean
  contentType: string
  filename: string
}

export async function generateRFIPDF(rfi: RFIPDFData): Promise<PDFResult> {
  let browser
  
  try {
    console.log('Starting PDF generation for RFI:', rfi.rfiNumber)
    console.log('Environment check:')
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    console.log('- DISPLAY:', process.env.DISPLAY)
    console.log('- PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH)
    console.log('- Chromium browser path:', process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser')
    
    // Check if Chromium exists
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || 
                        (process.env.NODE_ENV === 'production' ? '/usr/bin/chromium-browser' : undefined)
    
    if (chromiumPath) {
      const fs = require('fs')
      const chromiumExists = fs.existsSync(chromiumPath)
      console.log(`- Chromium exists at ${chromiumPath}:`, chromiumExists)
    }
    
    // Check available browser executables
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ].filter(Boolean)

    let executablePath = null
    const fs = require('fs')
    
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        executablePath = path
        break
      }
    }

    if (!executablePath) {
      throw new Error('No Chromium browser found. Checked paths: ' + possiblePaths.join(', '))
    }

    console.log('Using browser executable:', executablePath)

    browser = await puppeteer.launch({
      headless: true,
      args: [
        // Core security flags
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        
        // Process management (critical for Alpine/Docker)
        '--single-process',
        '--no-zygote',
        
        // Disable crash reporting (fixes crashpad_handler database issue)
        '--disable-crash-reporter',
        '--disable-breakpad',
        
        // GPU and hardware acceleration
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-gl-drawing-for-tests',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-accelerated-video-decode',
        '--disable-accelerated-video-encode',
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-extensions',
        '--use-gl=swiftshader',
        
        // Background processes and timers
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        
        // Features and extensions
        '--disable-features=TranslateUI,VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-component-extensions-with-background-pages',
        
        // Network and IPC
        '--disable-ipc-flooding-protection',
        '--disable-sync',
        '--disable-client-side-phishing-detection',
        
        // UI and interaction
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-hang-monitor',
        '--no-first-run',
        
        // Rendering optimizations
        '--disable-reading-from-canvas',
        '--disable-partial-raster',
        '--disable-skia-runtime-opts',
        '--disable-system-font-check',
        '--disable-cast-streaming-extensions',
        '--disable-logging',
        '--metrics-recording-only'
      ],
      timeout: 60000,
      executablePath: executablePath
    })

    console.log('Browser launched successfully')
    
    const page = await browser.newPage()
    
    // Set viewport and basic options
    await page.setViewport({ width: 800, height: 600 })
    
    // Set the HTML content
    const html = generateRFIHTML(rfi)
    console.log('Generated HTML content, length:', html.length)
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    })

    console.log('HTML content set, generating PDF...')

    // Generate PDF
    const generatedDate = format(new Date(), 'MMMM d, yyyy h:mm a')
    const pdf = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.8in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 auto;">
          Generated on ${generatedDate} | RFI System | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      headerTemplate: '<div></div>',
      timeout: 10000
    })

    console.log('PDF generated successfully, size:', pdf.length)
    return {
      buffer: Buffer.from(pdf),
      isPDF: true,
      contentType: 'application/pdf',
      filename: `RFI-${rfi.rfiNumber}.pdf`
    }
  } catch (error) {
    console.error('Error generating PDF with Puppeteer:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Don't fallback to text in production - throw the error
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    // Fallback to text export in development only
    console.log('Development mode: Falling back to text export...')
    const fallback = generateFallbackText(rfi)
    return {
      buffer: fallback.buffer,
      isPDF: false,
      contentType: 'text/plain',
      filename: `RFI-${rfi.rfiNumber}.txt`
    }
  } finally {
    if (browser) {
      try {
        await browser.close()
        console.log('Browser closed successfully')
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
  }
}

export async function generateMultipleRFIPDFs(rfis: RFIPDFData[]): Promise<PDFResult[]> {
  const results: PDFResult[] = []
  
  for (const rfi of rfis) {
    try {
      const result = await generateRFIPDF(rfi)
      results.push(result)
    } catch (error) {
      console.error(`Failed to generate PDF for RFI ${rfi.rfiNumber}:`, error)
      // Continue with other PDFs even if one fails
    }
  }
  
  return results
}