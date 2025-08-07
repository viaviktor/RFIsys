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

    console.log('🔧 Starting user soft-delete fix...')

    // Find users that were deleted the old way (active=false but deletedAt=null)
    const brokenUsers = await prisma.user.findMany({
      where: {
        active: false,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    })

    console.log(`📊 Found ${brokenUsers.length} users with inconsistent soft-delete state`)

    if (brokenUsers.length === 0) {
      return NextResponse.json({
        message: 'No users need fixing',
        fixed: 0,
        failed: 0,
        users: []
      })
    }

    console.log('📋 Fixing users:', brokenUsers.map(u => `${u.name} (${u.email})`))

    // Update all these users to have proper deletedAt timestamps
    const updateResults = await Promise.allSettled(
      brokenUsers.map(user =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            deletedAt: user.updatedAt // Use their last update time as deletion time
          }
        })
      )
    )

    const successful = updateResults.filter(r => r.status === 'fulfilled').length
    const failed = updateResults.filter(r => r.status === 'rejected').length
    const failedUsers = updateResults
      .map((result, index) => result.status === 'rejected' ? brokenUsers[index] : null)
      .filter(Boolean)

    console.log(`✅ Successfully fixed ${successful} users`)
    if (failed > 0) {
      console.log(`❌ Failed to fix ${failed} users`)
    }

    // Verify the fix
    const remainingBroken = await prisma.user.count({
      where: {
        active: false,
        deletedAt: null
      }
    })

    return NextResponse.json({
      message: `Fixed ${successful} users with inconsistent soft-delete state`,
      fixed: successful,
      failed,
      remainingBroken,
      fixedUsers: brokenUsers.slice(0, successful),
      failedUsers
    })

  } catch (error) {
    console.error('Admin fix user soft-delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}