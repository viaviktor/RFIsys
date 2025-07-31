import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Upload route test working',
    timestamp: new Date().toISOString()
  })
}