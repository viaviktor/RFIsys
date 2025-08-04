import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// POST /api/admin/stakeholders/[id]/deactivate - Deactivate stakeholder account (admin only)
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
        },
        projectStakeholders: {
          select: {
            id: true,
            project: {
              select: {
                name: true
              }
            }
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
      return NextResponse.json({ error: 'Stakeholder account is already inactive' }, { status: 400 })
    }

    // Deactivate the stakeholder by clearing password and verification
    await prisma.contact.update({
      where: { id },
      data: {
        password: null,
        emailVerified: false,
        registrationEligible: false, // Prevent automatic re-registration
        updatedAt: new Date(),
      }
    })

    // Log the deactivation for audit
    const projectNames = targetContact.projectStakeholders.map(ps => ps.project.name).join(', ')
    console.log(`❌ Stakeholder deactivated by admin ${user.email}: ${targetContact.email} (${targetContact.role}) at ${targetContact.client?.name} (Projects: ${projectNames})`)

    return NextResponse.json({ 
      message: `${targetContact.name} has been deactivated successfully`,
      note: targetContact.projectStakeholders.length > 0 
        ? `Stakeholder remains assigned to ${targetContact.projectStakeholders.length} project(s) but cannot login`
        : 'Stakeholder deactivated and has no project assignments'
    })
  } catch (error) {
    console.error('Admin stakeholder deactivation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}