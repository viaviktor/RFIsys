import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple in-memory storage for webhook logs (resets on server restart)
const webhookLogs: any[] = []

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString()
    const headers = Object.fromEntries(request.headers.entries())
    
    // Try to get body as form data (Mailgun format)
    let body: any = {}
    try {
      const formData = await request.formData()
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
    } catch {
      // If not form data, try JSON
      try {
        body = await request.json()
      } catch {
        body = { error: 'Could not parse body' }
      }
    }
    
    // Store the webhook data
    const logEntry = {
      id: Date.now(),
      timestamp,
      headers: {
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type'],
        'x-forwarded-for': headers['x-forwarded-for'],
      },
      body,
      recipient: body.recipient || body.to || 'unknown',
      sender: body.sender || body.from || 'unknown',
      subject: body.subject || 'no subject'
    }
    
    webhookLogs.unshift(logEntry) // Add to beginning
    if (webhookLogs.length > 20) webhookLogs.pop() // Keep only last 20
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook logged',
      logId: logEntry.id
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to log webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Recent webhook logs',
    count: webhookLogs.length,
    logs: webhookLogs
  })
}