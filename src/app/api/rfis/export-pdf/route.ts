import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { generateMultipleRFIPDFs, PDFResult } from '@/lib/pdf'
import JSZip from 'jszip'
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

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfiIds } = await request.json()

    if (!rfiIds || !Array.isArray(rfiIds) || rfiIds.length === 0) {
      return NextResponse.json({ 
        error: 'No RFI IDs provided' 
      }, { status: 400 })
    }

    if (rfiIds.length > 50) {
      return NextResponse.json({ 
        error: 'Too many RFIs requested. Maximum 50 allowed.' 
      }, { status: 400 })
    }

    // Fetch RFIs with all related data
    const rfis = await prisma.rFI.findMany({
      where: { 
        id: { in: rfiIds }
      },
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
      orderBy: { createdAt: 'desc' },
    })

    if (rfis.length === 0) {
      return NextResponse.json({ error: 'No RFIs found' }, { status: 404 })
    }

    // Load attachment data for all RFIs
    const rfisWithImageData = await Promise.all(
      rfis.map(async (rfi) => {
        if (rfi.attachments && rfi.attachments.length > 0) {
          const attachmentsWithData = await Promise.all(
            rfi.attachments.map(att => loadAttachmentData(att))
          )
          return {
            ...rfi,
            attachments: attachmentsWithData
          }
        }
        return rfi
      })
    )

    if (rfisWithImageData.length === 1) {
      // Single RFI - return file directly
      const results: PDFResult[] = await generateMultipleRFIPDFs(rfisWithImageData as any)
      
      if (results.length === 0) {
        return NextResponse.json({ 
          error: 'Failed to generate PDF' 
        }, { status: 500 })
      }

      const result = results[0]
      const headers = new Headers()
      headers.set('Content-Type', result.contentType)
      headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
      headers.set('Content-Length', result.buffer.length.toString())

      return new NextResponse(result.buffer, { headers })
    } else {
      // Multiple RFIs - return ZIP file with files
      const results: PDFResult[] = await generateMultipleRFIPDFs(rfisWithImageData as any)
      
      if (results.length === 0) {
        return NextResponse.json({ 
          error: 'Failed to generate any files' 
        }, { status: 500 })
      }

      // Create ZIP file
      const zip = new JSZip()
      
      rfisWithImageData.forEach((rfi, index) => {
        if (results[index]) {
          zip.file(results[index].filename, results[index].buffer)
        }
      })

      const zipBuffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const headers = new Headers()
      headers.set('Content-Type', 'application/zip')
      headers.set('Content-Disposition', `attachment; filename="RFI-Export-${new Date().toISOString().split('T')[0]}.zip"`)
      headers.set('Content-Length', zipBuffer.length.toString())

      return new NextResponse(zipBuffer, { headers })
    }
  } catch (error) {
    console.error('Bulk PDF export error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? (error as any).cause : undefined
    })
    return NextResponse.json(
      { 
        error: 'Failed to export PDFs',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}