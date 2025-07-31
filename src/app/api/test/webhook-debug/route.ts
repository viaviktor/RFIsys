import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Log all incoming webhook data
    const webhookData: Record<string, any> = {}
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value
    }
    
    console.log('🔍 WEBHOOK DEBUG - Received data:', {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      formData: webhookData
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook debug data logged',
      receivedKeys: Object.keys(webhookData)
    })
    
  } catch (error) {
    console.error('🚨 WEBHOOK DEBUG ERROR:', error)
    return NextResponse.json({ 
      error: 'Debug webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Webhook debug endpoint active',
    timestamp: new Date().toISOString()
  })
}