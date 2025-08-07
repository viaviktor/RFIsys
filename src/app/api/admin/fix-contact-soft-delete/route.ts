import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admins to run this fix
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { confirm } = await request.json()
    
    if (!confirm) {
      return NextResponse.json({ 
        error: 'This operation requires confirmation. Send {"confirm": true} to proceed.' 
      }, { status: 400 })
    }

    console.log('🔧 Starting contact soft-delete fix...')

    // Find contacts that were deleted the old way (active=false but deletedAt=null)
    const brokenContacts = await prisma.contact.findMany({
      where: {
        active: false,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        clientId: true,
        updatedAt: true,
        client: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`📊 Found ${brokenContacts.length} contacts with inconsistent soft-delete state`)

    if (brokenContacts.length === 0) {
      return NextResponse.json({
        message: 'No contacts need fixing',
        fixed: 0,
        failed: 0,
        contacts: []
      })
    }

    console.log('📋 Fixing contacts:', brokenContacts.map(c => `${c.name} (${c.email})`))

    // Update all these contacts to have proper deletedAt timestamps
    const updateResults = await Promise.allSettled(
      brokenContacts.map(contact =>
        prisma.contact.update({
          where: { id: contact.id },
          data: {
            deletedAt: contact.updatedAt // Use their last update time as deletion time
          }
        })
      )
    )

    const successful = updateResults.filter(r => r.status === 'fulfilled').length
    const failed = updateResults.filter(r => r.status === 'rejected').length
    const failedContacts = updateResults
      .map((result, index) => result.status === 'rejected' ? brokenContacts[index] : null)
      .filter(Boolean)

    console.log(`✅ Successfully fixed ${successful} contacts`)
    if (failed > 0) {
      console.log(`❌ Failed to fix ${failed} contacts`)
    }

    // Verify the fix
    const remainingBroken = await prisma.contact.count({
      where: {
        active: false,
        deletedAt: null
      }
    })

    return NextResponse.json({
      message: `Fixed ${successful} contacts with inconsistent soft-delete state`,
      fixed: successful,
      failed,
      remainingBroken,
      fixedContacts: brokenContacts.slice(0, successful),
      failedContacts
    })

  } catch (error) {
    console.error('Admin fix contact soft-delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}