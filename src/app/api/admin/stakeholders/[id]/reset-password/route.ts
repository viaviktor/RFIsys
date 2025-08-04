import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// POST /api/admin/stakeholders/[id]/reset-password - Reset stakeholder password (admin only)
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

    // Verify the contact exists and is a stakeholder
    const targetContact = await prisma.contact.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        password: true,
        client: {
          select: {
            name: true
          }
        }
      }
    })

    if (!targetContact) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
    }

    if (!targetContact.role || !['STAKEHOLDER_L1', 'STAKEHOLDER_L2'].includes(targetContact.role)) {
      return NextResponse.json({ error: 'Contact is not a stakeholder' }, { status: 400 })
    }

    if (!targetContact.password) {
      return NextResponse.json({ error: 'Stakeholder does not have an active account' }, { status: 400 })
    }

    // Set password to null - stakeholder will need admin to create new password or re-register
    await prisma.contact.update({
      where: { id },
      data: {
        password: null,
        updatedAt: new Date(),
        // Keep emailVerified and registrationEligible as they are for re-registration
      }
    })

    // Log the password reset for security audit
    console.log(`🔒 Stakeholder password reset by admin ${user.email} for: ${targetContact.email} (${targetContact.role}) at ${targetContact.client?.name}`)

    return NextResponse.json({ 
      message: `Password reset for ${targetContact.name}. Stakeholder will need to contact administrator for new access or re-register via invitation.`
    })
  } catch (error) {
    console.error('Admin stakeholder password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}