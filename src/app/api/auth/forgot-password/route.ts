import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailWithProvider } from '@/lib/email-providers'
import crypto from 'crypto'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user (check both internal users and contacts)
    let user = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        deletedAt: null,
        active: true
      }
    })

    let contact = null
    if (!user) {
      contact = await prisma.contact.findFirst({
        where: {
          email: email.toLowerCase(),
          deletedAt: null,
          password: { not: null } // Only contacts with passwords (registered stakeholders)
        }
      })
    }

    // Always return success to prevent email enumeration attacks
    const response = { 
      success: true, 
      message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
    }

    if (!user && !contact) {
      // Still return success but don't send email
      return NextResponse.json(response)
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    if (user) {
      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetExpires
        }
      })

      // Send reset email to user
      console.log('🔄 Sending password reset email to user:', user.email)
      const emailResult = await sendEmailWithProvider({
        to: user.email,
        subject: 'Reset Your RFI System Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">STEEL RFI SYSTEM</h1>
              <p style="color: #fed7aa; margin: 10px 0 0 0;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0;">Reset Your Password</h2>
              
              <p style="color: #475569; margin-bottom: 20px;">
                Hello ${user.name},
              </p>
              
              <p style="color: #475569; margin-bottom: 25px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}" 
                   style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
                This link will expire in 30 minutes. If you didn't request this reset, you can safely ignore this email.
              </p>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 15px;">
                If the button doesn't work, copy and paste this link:<br>
                <span style="word-break: break-all;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}</span>
              </p>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #1e293b; color: #94a3b8;">
              <p style="margin: 0; font-size: 14px;">
                © 2025 Steel RFI System - Industrial Request for Information Management
              </p>
            </div>
          </div>
        `
      })
      
      if (emailResult.success) {
        console.log('✅ Password reset email sent successfully to user:', user.email)
      } else {
        console.error('❌ Failed to send password reset email to user:', user.email, 'Error:', emailResult.error)
        // Still return success to prevent enumeration, but log the error
      }
    } else if (contact) {
      // Update contact with reset token
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          resetToken,
          resetExpires
        }
      })

      // Send reset email to contact
      console.log('🔄 Sending password reset email to contact:', contact.email)
      const contactEmailResult = await sendEmailWithProvider({
        to: contact.email,
        subject: 'Reset Your RFI System Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">STEEL RFI SYSTEM</h1>
              <p style="color: #fed7aa; margin: 10px 0 0 0;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0;">Reset Your Password</h2>
              
              <p style="color: #475569; margin-bottom: 20px;">
                Hello ${contact.name},
              </p>
              
              <p style="color: #475569; margin-bottom: 25px;">
                We received a request to reset your stakeholder account password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}" 
                   style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 25px;">
                This link will expire in 30 minutes. If you didn't request this reset, you can safely ignore this email.
              </p>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 15px;">
                If the button doesn't work, copy and paste this link:<br>
                <span style="word-break: break-all;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}</span>
              </p>
            </div>
            
            <div style="padding: 20px; text-align: center; background: #1e293b; color: #94a3b8;">
              <p style="margin: 0; font-size: 14px;">
                © 2025 Steel RFI System - Industrial Request for Information Management
              </p>
            </div>
          </div>
        `
      })
      
      if (contactEmailResult.success) {
        console.log('✅ Password reset email sent successfully to contact:', contact.email)
      } else {
        console.error('❌ Failed to send password reset email to contact:', contact.email, 'Error:', contactEmailResult.error)
        // Still return success to prevent enumeration, but log the error
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Forgot password error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}