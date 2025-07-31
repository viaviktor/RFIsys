import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { appConfig } from '@/lib/env'

export async function GET(request: NextRequest) {
  try {
    console.log('=== File System Debug ===')
    
    const uploadDir = appConfig.upload.dir
    console.log('Upload directory configured as:', uploadDir)
    
    // Check if upload directory exists
    try {
      const dirStat = await stat(uploadDir)
      console.log('Upload directory exists:', dirStat.isDirectory())
    } catch (error) {
      console.log('Upload directory does not exist:', error)
      return NextResponse.json({
        error: 'Upload directory does not exist',
        uploadDir,
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 404 })
    }
    
    // List files in upload directory
    const files = await readdir(uploadDir)
    console.log('Files in upload directory:', files)
    
    // Check specific file
    const testFile = 'de74205b-ac50-448b-946e-7836323933b5.png'
    const testFilePath = join(uploadDir, testFile)
    
    let fileExists = false
    let fileStats = null
    try {
      fileStats = await stat(testFilePath)
      fileExists = true
      console.log('Test file exists:', testFile, 'Size:', fileStats.size)
    } catch (error) {
      console.log('Test file does not exist:', testFile)
    }
    
    return NextResponse.json({
      uploadDir,
      filesCount: files.length,
      files: files.slice(0, 10), // First 10 files
      testFile: {
        filename: testFile,
        exists: fileExists,
        size: fileStats?.size || null,
        path: testFilePath
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CLOUDRON_DATA_DIR: process.env.CLOUDRON_DATA_DIR,
        UPLOAD_DIR: process.env.UPLOAD_DIR
      }
    })
    
  } catch (error) {
    console.error('File system debug error:', error)
    return NextResponse.json({
      error: 'File system debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}