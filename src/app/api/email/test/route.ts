import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { sendTestEmail } from '@/lib/email'
import { z } from 'zod'

const testEmailSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(request: NextRequest) {
  try {
    console.log('Email test endpoint called')
    console.log('Cookies:', request.cookies.getAll())
    console.log('Auth header:', request.headers.get('authorization'))
    
    const user = await authenticateRequest(request)
    console.log('Authentication result:', user ? `Success for ${user.email}` : 'Failed - no user returned')
    
    if (!user) {
      console.log('Authentication failed - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const result = testEmailSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address', details: result.error.issues },
        { status: 400 }
      )
    }

    const { email } = result.data

    // Send test email
    const emailResult = await sendTestEmail(email)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    console.log(`Test email sent to: ${email}`)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}