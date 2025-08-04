import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, hashPassword, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// POST /api/account/password - Change password
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Get current password hash
    let currentHashedPassword: string | null = null

    if (user.userType === 'stakeholder') {
      const contact = await prisma.contact.findUnique({
        where: { id: user.contactId! },
        select: { password: true }
      })
      currentHashedPassword = contact?.password || null
    } else {
      const internalUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { password: true }
      })
      currentHashedPassword = internalUser?.password || null
    }

    // Verify current password
    if (!currentHashedPassword || !await verifyPassword(currentPassword, currentHashedPassword)) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const newHashedPassword = await hashPassword(newPassword)

    // Update password
    if (user.userType === 'stakeholder') {
      await prisma.contact.update({
        where: { id: user.contactId! },
        data: { 
          password: newHashedPassword,
          updatedAt: new Date(),
        }
      })
    } else {
      await prisma.user.update({
        where: { id: user.userId },
        data: { 
          password: newHashedPassword,
          updatedAt: new Date(),
        }
      })
    }

    // Log password change for security audit
    console.log(`🔒 Password changed for user: ${user.email} (${user.userType})`)

    return NextResponse.json({ 
      message: 'Password changed successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}