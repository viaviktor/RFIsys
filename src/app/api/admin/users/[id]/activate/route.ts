import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// POST /api/admin/users/[id]/activate - Activate user account (admin only)
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
      select: { id: true, name: true, email: true, role: true, active: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.active) {
      return NextResponse.json({ error: 'User is already active' }, { status: 400 })
    }

    // Activate the user
    await prisma.user.update({
      where: { id },
      data: {
        active: true,
        updatedAt: new Date(),
      }
    })

    // Log the activation for audit
    console.log(`✅ User activated by admin ${user.email}: ${targetUser.email} (${targetUser.role})`)

    return NextResponse.json({ 
      message: `${targetUser.name} has been activated successfully`
    })
  } catch (error) {
    console.error('Admin user activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}