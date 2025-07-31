import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  
  return NextResponse.json({ 
    message: 'Simple filename route working',
    filename,
    timestamp: new Date().toISOString()
  })
}