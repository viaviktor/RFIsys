import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// POST /api/admin/users/[id]/reset-password - Reset user password (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.userType !== 'internal' || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate a temporary disabled password - user will need admin to reset
    const tempDisabledPassword = `DISABLED_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    await prisma.user.update({
      where: { id },
      data: {
        password: tempDisabledPassword, // Unusable password
        active: false, // Disable account until admin resets password
        updatedAt: new Date(),
      }
    })

    // Log the password reset for security audit
    console.log(`🔒 Password reset by admin ${user.email} for user: ${targetUser.email} (${targetUser.role})`)

    return NextResponse.json({ 
      message: `Password reset for ${targetUser.name}. Account has been disabled and user will need administrator to create new password and reactivate account.`
    })
  } catch (error) {
    console.error('Admin password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}