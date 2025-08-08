import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, hashPassword, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email format').optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Privacy compliance data export schema
const dataExportSchema = z.object({
  includePersonalData: z.boolean().default(true),
  includeActivityData: z.boolean().default(true),
  includeSystemLogs: z.boolean().default(false),
  format: z.enum(['json', 'csv']).default('json'),
})

// GET /api/account - Get current user account details
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let accountData

    if (user.userType === 'stakeholder') {
      // Get stakeholder contact data
      const contact = await prisma.contact.findUnique({
        where: { id: user.contactId! },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          emailVerified: true,
          client: {
            select: {
              id: true,
              name: true,
            }
          },
          projectStakeholders: {
            select: {
              project: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        }
      })

      if (!contact) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      accountData = {
        ...contact,
        userType: 'stakeholder',
        projects: contact.projectStakeholders.map(ps => ps.project),
      }
    } else {
      // Get internal user data
      const internalUser = await prisma.user.findUnique({
        where: { id: user.userId },
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

      if (!internalUser) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      accountData = {
        ...internalUser,
        userType: 'internal',
      }
    }

    return NextResponse.json({ data: accountData })
  } catch (error) {
    console.error('Get account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/account - Update account information
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAccountSchema.parse(body)

    const { name, email, currentPassword, newPassword, phone, title } = validatedData

    // If changing password, verify current password
    if (newPassword && currentPassword) {
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

      if (!currentHashedPassword || !await verifyPassword(currentPassword, currentHashedPassword)) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }
    }

    // Check if email is already taken (if changing email)
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findFirst({ 
        where: { 
          email,
          deletedAt: null // Only check non-deleted users
        } 
      })
      const existingContact = await prisma.contact.findFirst({ 
        where: { 
          email, 
          password: { not: null },
          deletedAt: null // Only check non-deleted contacts
        } 
      })

      if (existingUser || existingContact) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 409 }
        )
      }
    }

    let updatedAccount

    if (user.userType === 'stakeholder') {
      // Update stakeholder contact
      const updateData: any = { name }
      
      if (email) updateData.email = email
      if (newPassword) updateData.password = await hashPassword(newPassword)
      if (phone !== undefined) updateData.phone = phone
      if (title !== undefined) updateData.title = title

      updatedAccount = await prisma.contact.update({
        where: { id: user.contactId! },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          role: true,
          updatedAt: true,
        }
      })
    } else {
      // Update internal user
      const updateData: any = { name }
      
      if (email) updateData.email = email
      if (newPassword) updateData.password = await hashPassword(newPassword)

      updatedAccount = await prisma.user.update({
        where: { id: user.userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          updatedAt: true,
        }
      })
    }

    return NextResponse.json({ 
      data: updatedAccount,
      message: 'Account updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Update account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/account - Account deletion (privacy compliance)
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const confirmDeletion = searchParams.get('confirm') === 'true'

    if (!confirmDeletion) {
      return NextResponse.json(
        { error: 'Account deletion requires confirmation parameter: ?confirm=true' },
        { status: 400 }
      )
    }

    // Stakeholders cannot delete their own accounts if they have active project relationships
    if (user.userType === 'stakeholder') {
      const activeStakeholderCount = await prisma.projectStakeholder.count({
        where: { contactId: user.contactId! }
      })

      if (activeStakeholderCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete account while you have active project assignments. Please contact an administrator.' },
          { status: 400 }
        )
      }

      // Soft delete by clearing sensitive data
      await prisma.contact.update({
        where: { id: user.contactId! },
        data: {
          name: 'Deleted User',
          email: `deleted-${user.contactId}@deleted.local`,
          phone: null,
          title: null,
          password: null,
          emailVerified: false,
          registrationEligible: false,
        }
      })
    } else {
      // Internal users - soft delete
      const rfisCreatedCount = await prisma.rFI.count({
        where: { createdById: user.userId }
      })

      if (rfisCreatedCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete account while you have created RFIs. Please contact an administrator for data transfer.' },
          { status: 400 }
        )
      }

      await prisma.user.update({
        where: { id: user.userId },
        data: {
          name: 'Deleted User',
          email: `deleted-${user.userId}@deleted.local`,
          active: false,
        }
      })
    }

    return NextResponse.json({ 
      message: 'Account has been successfully deleted. All personal data has been anonymized.' 
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}