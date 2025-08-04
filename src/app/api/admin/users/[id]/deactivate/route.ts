import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// POST /api/admin/users/[id]/deactivate - Deactivate user account (admin only)
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

    // Prevent admin from deactivating themselves
    if (user.userId === id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!targetUser.active) {
      return NextResponse.json({ error: 'User is already inactive' }, { status: 400 })
    }

    // Deactivate the user
    await prisma.user.update({
      where: { id },
      data: {
        active: false,
        updatedAt: new Date(),
      }
    })

    // Log the deactivation for audit
    console.log(`❌ User deactivated by admin ${user.email}: ${targetUser.email} (${targetUser.role})`)

    return NextResponse.json({ 
      message: `${targetUser.name} has been deactivated successfully`
    })
  } catch (error) {
    console.error('Admin user deactivation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}