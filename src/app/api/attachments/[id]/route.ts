import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { appConfig } from '@/lib/env'

const UPLOAD_DIR = appConfig.upload.dir

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: attachmentId } = await params

    // Find the attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        rfi: true,
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Check if user has permission to delete (either created the RFI or uploaded the file)
    if (attachment.uploadedBy !== user.id && attachment.rfi.createdById !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
      // Delete file from filesystem
      const filePath = join(UPLOAD_DIR, attachment.storedName)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Could not delete file:', fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete attachment record from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({ message: 'Attachment deleted successfully' })
  } catch (error) {
    console.error('DELETE attachment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}