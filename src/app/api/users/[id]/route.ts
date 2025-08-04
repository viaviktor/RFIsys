import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, hashPassword } from '@/lib/auth'
import { markAsDeleted } from '@/lib/soft-delete'
import { Role } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Users can view their own profile, admins can view any profile
    if (user.role !== 'ADMIN' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Try to find in users table first (exclude soft-deleted)
    let targetUser = await prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null // Only non-deleted users
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rfisCreated: true,
            responses: true,
            projects: true,
          }
        }
      }
    })

    let userType: 'internal' | 'stakeholder' = 'internal'
    let clientName: string | undefined

    // If not found in users table, try contacts table (exclude soft-deleted)
    if (!targetUser) {
      const targetContact = await prisma.contact.findFirst({
        where: { 
          id,
          deletedAt: null // Only non-deleted contacts
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          password: true,
          client: {
            select: {
              name: true
            }
          },
          projectStakeholders: {
            select: {
              project: {
                select: {
                  id: true
                }
              }
            }
          },
          // Count responses as stakeholder author
          _count: {
            select: {
              responses: true
            }
          }
        }
      })

      if (!targetContact) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Convert contact to user format
      targetUser = {
        id: targetContact.id,
        name: targetContact.name,
        email: targetContact.email,
        role: targetContact.role || 'STAKEHOLDER_L1',
        active: !!targetContact.password, // Active if registered (has password)
        deletedAt: null, // Contacts don't use deletedAt field in this query
        createdAt: targetContact.createdAt,
        updatedAt: targetContact.updatedAt,
        _count: {
          rfisCreated: 0, // Stakeholders don't create RFIs
          responses: targetContact._count.responses,
          projects: targetContact.projectStakeholders.length
        }
      }
      
      userType = 'stakeholder'
      clientName = targetContact.client?.name
    }

    return NextResponse.json({ 
      data: {
        ...targetUser,
        userType,
        clientName,
        projectCount: targetUser._count.projects
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { name, email, role, active, password } = await request.json()

    // Validate input
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: { 
          email,
          NOT: { id }
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already in use by another user' },
          { status: 409 }
        )
      }
    }

    if (role !== undefined && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    if (password !== undefined && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user exists and is not soft-deleted
    const existingUser = await prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-deactivation or role change for the current admin
    if (id === user.id) {
      if (active === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        )
      }
      if (role && role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You cannot change your own admin role' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role as Role
    if (active !== undefined) updateData.active = active
    if (password !== undefined) {
      updateData.password = await hashPassword(password)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rfisCreated: true,
            responses: true,
            projects: true,
          }
        }
      }
    })

    return NextResponse.json({ data: updatedUser })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists and is not already soft-deleted
    const existingUser = await prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            rfisCreated: true,
            responses: true,
            projects: true,
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete the user - always preserve data integrity
    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        ...markAsDeleted(),
        active: false, // Also deactivate for immediate effect
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ 
      data: deletedUser,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}