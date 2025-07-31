import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params
  
  return NextResponse.json({ 
    message: 'Simple filename route working',
    filename,
    timestamp: new Date().toISOString()
  })
}