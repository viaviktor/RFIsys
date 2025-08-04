import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, hashPassword } from '@/lib/auth'
import { generateSecureToken } from '@/lib/utils'

// POST /api/admin/stakeholders/[id]/activate - Activate stakeholder account (admin only)
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

    // Get request body for optional password or auto-generation
    const body = await request.json().catch(() => ({}))
    const { password } = body

    // Verify the contact exists and is a stakeholder
    const targetContact = await prisma.contact.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        password: true,
        emailVerified: true,
        registrationEligible: true,
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

    if (targetContact.password) {
      return NextResponse.json({ error: 'Stakeholder account is already active' }, { status: 400 })
    }

    // Generate or use provided password
    const finalPassword = password || generateSecureToken().substring(0, 12) // 12-char auto password
    const hashedPassword = await hashPassword(finalPassword)

    // Activate the stakeholder
    await prisma.contact.update({
      where: { id },
      data: {
        password: hashedPassword,
        emailVerified: true,
        registrationEligible: true,
        updatedAt: new Date(),
      }
    })

    // Log the activation for audit
    console.log(`✅ Stakeholder activated by admin ${user.email}: ${targetContact.email} (${targetContact.role}) at ${targetContact.client?.name}`)

    return NextResponse.json({ 
      message: `${targetContact.name} has been activated successfully`,
      temporaryPassword: password ? undefined : finalPassword, // Only return if auto-generated
      note: password ? 'Account activated with provided password' : 'Account activated with temporary password - stakeholder should change it immediately'
    })
  } catch (error) {
    console.error('Admin stakeholder activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}