import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { appConfig } from '@/lib/env'
import { v4 as uuidv4 } from 'uuid'

// Use configured upload directory (supports Cloudron data directory)
const UPLOAD_DIR = appConfig.upload.dir

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

    // Verify RFI exists and user has access
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    return NextResponse.json({ data: rfi.attachments })
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rfiId } = await params

    // Verify RFI exists and user has access
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string

    console.log('File upload request:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      hasDescription: !!description
    })

    if (!file) {
      console.error('No file provided in FormData')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const storedName = `${uuidv4()}.${fileExtension}`
    const filePath = join(UPLOAD_DIR, storedName)
    
    console.log('Upload directory:', UPLOAD_DIR)
    console.log('File path:', filePath)

    // Save file to disk
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      console.log('Writing file to:', filePath, 'Size:', buffer.length)
      await writeFile(filePath, buffer)
      console.log('File written successfully')
    } catch (writeError) {
      console.error('Failed to write file:', writeError)
      throw new Error(`Failed to save file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`)
    }

    // Save attachment record to database
    try {
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          storedName,
          url: `/api/uploads/${storedName}`,
          size: file.size,
          mimeType: file.type,
          description: description || null,
          rfiId,
          uploadedBy: user.id,
        },
      })

      console.log('Attachment record created:', attachment.id)
      return NextResponse.json(attachment, { status: 201 })
    } catch (dbError) {
      console.error('Failed to create attachment record:', dbError)
      // Try to clean up the file if database insert failed
      try {
        const fs = await import('fs/promises')
        await fs.unlink(filePath)
        console.log('Cleaned up file after database error')
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError)
      }
      throw new Error(`Failed to save attachment record: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`)
    }
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}