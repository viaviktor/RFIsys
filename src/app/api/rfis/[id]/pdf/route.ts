import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { generateRFIPDF, PDFResult } from '@/lib/pdf'
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rfiId } = await params

    // Fetch RFI with all related data
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        client: true,
        project: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        responses: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

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

    // Generate PDF
    console.log('Generating PDF for RFI:', rfi.rfiNumber)
    const result: PDFResult = await generateRFIPDF(rfiWithImageData as any)
    console.log('PDF generation result:', {
      isPDF: result.isPDF,
      contentType: result.contentType,
      filename: result.filename,
      bufferSize: result.buffer.length
    })

    // Set response headers based on actual content type
    const headers = new Headers()
    headers.set('Content-Type', result.contentType)
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    headers.set('Content-Length', result.buffer.length.toString())
    
    // Add CORS headers for downloads
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')

    // If PDF generation failed, return error instead of corrupted file
    if (!result.isPDF && result.contentType === 'text/plain') {
      console.warn('PDF generation failed, returning error instead of corrupted file')
      return NextResponse.json(
        { error: 'PDF generation failed. Please try again or contact support.' },
        { status: 500 }
      )
    }

    return new NextResponse(result.buffer, { headers })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}