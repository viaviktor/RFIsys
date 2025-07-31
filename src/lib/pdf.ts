import jsPDF from 'jspdf'
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

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMMM d, yyyy')
}

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMMM d, yyyy h:mm a')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export type PDFResult = {
  buffer: Buffer
  isPDF: boolean
  contentType: string
  filename: string
}

export async function generateRFIPDF(rfi: RFIPDFData): Promise<PDFResult> {
  try {
    console.log('Starting jsPDF generation for RFI:', rfi.rfiNumber)
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    })

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const contentWidth = pageWidth - (margin * 2)
    
    let yPos = margin + 20

    // Helper functions
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const fontSize = options.fontSize || 11
      const fontStyle = options.fontStyle || 'normal'
      const maxWidth = options.maxWidth || contentWidth
      
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', fontStyle)
      
      if (options.color) {
        doc.setTextColor(options.color)
      }
      
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y)
      
      // Reset color to black
      doc.setTextColor(0, 0, 0)
      
      return y + (lines.length * fontSize * 1.2) + (options.marginBottom || 0)
    }

    const addLine = (x1: number, y1: number, x2: number, y2: number, width = 1) => {
      doc.setLineWidth(width)
      doc.line(x1, y1, x2, y2)
    }

    const addRect = (x: number, y: number, width: number, height: number, style = 'S') => {
      doc.rect(x, y, width, height, style)
    }

    // Header
    yPos = addText('REQUEST FOR INFORMATION', margin, yPos, {
      fontSize: 20,
      fontStyle: 'bold',
      marginBottom: 10
    })
    
    yPos = addText(`RFI# ${rfi.rfiNumber}: ${rfi.title}`, margin, yPos, {
      fontSize: 14,
      fontStyle: 'bold',
      marginBottom: 20
    })

    // Header line
    addLine(margin, yPos, pageWidth - margin, yPos, 2)
    yPos += 20

    // Two-column layout
    const leftColX = margin
    const rightColX = margin + (contentWidth / 2) + 10
    const colWidth = (contentWidth / 2) - 10
    
    const startY = yPos

    // Left Column - RFI Details
    let leftY = yPos
    leftY = addText('RFI DETAILS', leftColX, leftY, {
      fontSize: 12,
      fontStyle: 'bold',
      marginBottom: 10
    })

    // Add detail rows
    const addDetailRow = (label: string, value: string, x: number, y: number) => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, x, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value, x + 80, y)
      return y + 15
    }

    leftY = addDetailRow('Status', rfi.status.replace('_', ' '), leftColX, leftY)
    leftY = addDetailRow('Priority', rfi.priority, leftColX, leftY)
    leftY = addDetailRow('Direction', rfi.direction === 'OUTGOING' ? 'To Client' : 'From Client', leftColX, leftY)
    leftY = addDetailRow('Urgency', rfi.urgency, leftColX, leftY)
    leftY = addDetailRow('Created By', rfi.createdBy.name, leftColX, leftY)
    leftY = addDetailRow('Created', formatDate(rfi.createdAt), leftColX, leftY)
    
    if (rfi.dateNeededBy) {
      leftY = addDetailRow('Due Date', formatDate(rfi.dateNeededBy), leftColX, leftY)
    }

    // Right Column - Project Information
    let rightY = yPos
    rightY = addText('PROJECT INFORMATION', rightColX, rightY, {
      fontSize: 12,
      fontStyle: 'bold',
      marginBottom: 10
    })

    rightY = addDetailRow('Project', rfi.project.projectNumber, rightColX, rightY)
    rightY = addDetailRow('Name', rfi.project.name, rightColX, rightY)
    rightY = addDetailRow('Client', rfi.client.name, rightColX, rightY)
    rightY = addDetailRow('Contact', rfi.client.contactName, rightColX, rightY)
    rightY = addDetailRow('Email', rfi.client.email, rightColX, rightY)
    
    if (rfi.client.phone) {
      rightY = addDetailRow('Phone', rfi.client.phone, rightColX, rightY)
    }

    // Move to next section
    yPos = Math.max(leftY, rightY) + 20

    // Helper function to add bordered section
    const addSection = (title: string, content: string, minHeight = 60) => {
      // Check if we need a new page
      if (yPos + minHeight > pageHeight - margin) {
        doc.addPage()
        yPos = margin + 20
      }

      const sectionStartY = yPos
      
      // Section header
      yPos = addText(title.toUpperCase(), margin + 10, yPos + 15, {
        fontSize: 12,
        fontStyle: 'bold',
        marginBottom: 10
      })

      // Header line
      addLine(margin + 10, yPos, pageWidth - margin - 10, yPos, 0.5)
      yPos += 10

      // Content
      yPos = addText(content, margin + 10, yPos, {
        fontSize: 11,
        maxWidth: contentWidth - 20,
        marginBottom: 10
      })

      // Calculate section height
      const sectionHeight = Math.max(minHeight, yPos - sectionStartY + 10)
      
      // Draw border
      addRect(margin, sectionStartY, contentWidth, sectionHeight)
      
      yPos = sectionStartY + sectionHeight + 15
    }

    // Description Section
    addSection('Description', rfi.description)

    // Suggested Solution
    if (rfi.suggestedSolution) {
      addSection('Suggested Solution', rfi.suggestedSolution)
    }

    // Attachments
    if (rfi.attachments && rfi.attachments.length > 0) {
      const attachmentHeight = (rfi.attachments.length * 20) + 60
      
      if (yPos + attachmentHeight > pageHeight - margin) {
        doc.addPage()
        yPos = margin + 20
      }

      const sectionStartY = yPos
      
      yPos = addText('ATTACHMENTS', margin + 10, yPos + 15, {
        fontSize: 12,
        fontStyle: 'bold',
        marginBottom: 10
      })

      rfi.attachments.forEach(attachment => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(attachment.filename, margin + 10, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(formatFileSize(attachment.size), pageWidth - margin - 100, yPos)
        yPos += 16
      })

      addRect(margin, sectionStartY, contentWidth, yPos - sectionStartY + 10)
      yPos += 25
    }

    // Existing Responses
    if (rfi.responses && rfi.responses.length > 0) {
      let responsesHeight = 80
      rfi.responses.forEach(response => {
        responsesHeight += doc.splitTextToSize(response.content, contentWidth - 40).length * 12 + 25
      })

      if (yPos + responsesHeight > pageHeight - margin) {
        doc.addPage()
        yPos = margin + 20
      }

      const sectionStartY = yPos
      
      yPos = addText('EXISTING RESPONSES', margin + 10, yPos + 15, {
        fontSize: 12,
        fontStyle: 'bold',
        marginBottom: 15
      })

      rfi.responses.forEach(response => {
        // Response header
        yPos = addText(`${response.author.name} - ${formatDateTime(response.createdAt)}`, margin + 10, yPos, {
          fontSize: 9,
          fontStyle: 'bold',
          color: '#666666',
          marginBottom: 5
        })

        // Response content
        yPos = addText(response.content, margin + 10, yPos, {
          fontSize: 10,
          maxWidth: contentWidth - 20,
          marginBottom: 10
        })
      })

      addRect(margin, sectionStartY, contentWidth, yPos - sectionStartY + 10)
      yPos += 25
    }

    // Response Section
    const responseHeight = 120
    
    if (yPos + responseHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin + 20
    }

    const responseSectionY = yPos
    
    yPos = addText('RESPONSE', margin + 10, yPos + 15, {
      fontSize: 12,
      fontStyle: 'bold',
      marginBottom: 10
    })

    yPos = addText('Please provide your response below. Use additional sheets if necessary.', margin + 10, yPos, {
      fontSize: 9,
      fontStyle: 'italic',
      color: '#666666',
      marginBottom: 15
    })

    // Dashed response area
    const dashAreaY = yPos
    const dashAreaHeight = 50
    
    // Draw dashed border
    doc.setLineDashPattern([2, 2], 0)
    addRect(margin + 10, dashAreaY, contentWidth - 20, dashAreaHeight)
    doc.setLineDashPattern([], 0) // Reset dash pattern

    yPos = dashAreaY + dashAreaHeight + 15

    // Signature lines
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Responded By:', margin + 10, yPos)
    doc.text('Date:', rightColX, yPos)
    
    // Draw signature lines
    addLine(margin + 85, yPos + 5, rightColX - 20, yPos + 5, 0.5)
    addLine(rightColX + 35, yPos + 5, pageWidth - margin - 10, yPos + 5, 0.5)

    // Draw response section border
    addRect(margin, responseSectionY, contentWidth, responseHeight)

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#666666')
    const footerText = `Generated on ${formatDateTime(new Date().toISOString())} | RFI System`
    const footerWidth = doc.getTextWidth(footerText)
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 20)

    // Generate buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    console.log('jsPDF generated successfully, size:', pdfBuffer.length)
    
    return {
      buffer: pdfBuffer,
      isPDF: true,
      contentType: 'application/pdf',
      filename: `RFI-${rfi.rfiNumber}.pdf`
    }
  } catch (error) {
    console.error('Error generating PDF with jsPDF:', error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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