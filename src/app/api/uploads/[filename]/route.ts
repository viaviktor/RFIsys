import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { appConfig } from '@/lib/env'

const UPLOAD_DIR = appConfig.upload.dir

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params
    const filePath = join(UPLOAD_DIR, filename)

    try {
      // Check if file exists
      await stat(filePath)
      
      // Read file
      const fileBuffer = await readFile(filePath)
      
      // Get file extension to determine content type
      const extension = filename.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'gif':
          contentType = 'image/gif'
          break
        case 'webp':
          contentType = 'image/webp'
          break
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'doc':
          contentType = 'application/msword'
          break
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'xls':
          contentType = 'application/vnd.ms-excel'
          break
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'txt':
          contentType = 'text/plain'
          break
        case 'csv':
          contentType = 'text/csv'
          break
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (fileError) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('GET file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}