import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

// Ensure upload directory exists
const UPLOAD_DIR = join(process.cwd(), 'uploads')

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

    if (!file) {
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

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Save attachment record to database
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        storedName,
        url: `/uploads/${storedName}`,
        size: file.size,
        mimeType: file.type,
        description: description || null,
        rfiId,
        uploadedBy: user.id,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}