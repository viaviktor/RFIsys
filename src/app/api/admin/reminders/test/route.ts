import { NextResponse } from 'next/server'
import { processRFIReminders } from '@/lib/cron'

export async function POST() {
  try {
    console.log('🧪 Manual test of RFI reminder system triggered')
    
    await processRFIReminders()
    
    return NextResponse.json({ 
      success: true, 
      message: 'RFI reminder processing completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Manual RFI reminder test failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process RFI reminders',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'RFI Reminder Test Endpoint',
    description: 'POST to this endpoint to manually trigger RFI reminder processing',
    usage: 'POST /api/admin/reminders/test'
  })
}