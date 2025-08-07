import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, createAuthResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email - check both internal users and stakeholder contacts
    let user: any = await prisma.user.findUnique({
      where: { email },
    })

    let userType: 'internal' | 'stakeholder' = 'internal'
    let projectAccess: string[] = []

    // If not found in users table, check contacts table
    if (!user) {
      const contact = await prisma.contact.findFirst({
        where: { 
          email, 
          password: { not: null }, // Only contacts with passwords can login
          deletedAt: null, // Only non-deleted contacts can login
        },
        include: {
          projectStakeholders: {
            select: { projectId: true, stakeholderLevel: true }
          }
        }
      })

      if (contact) {
        user = contact
        userType = 'stakeholder'
        projectAccess = contact.projectStakeholders.map(ps => ps.projectId)
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      )
    }

    // Verify password
    if (!user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login for stakeholders
    if (userType === 'stakeholder') {
      await prisma.contact.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })
    }

    // Create JWT token
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      userType,
      projectAccess: userType === 'stakeholder' ? projectAccess : undefined,
      canInvite: user.role === 'STAKEHOLDER_L1' || userType === 'internal',
    })

    // Create response
    const authResponse = createAuthResponse({
      ...user,
      userType,
      contactId: userType === 'stakeholder' ? user.id : null,
      projectAccess: userType === 'stakeholder' ? projectAccess : undefined
    }, token)

    // Set httpOnly cookie
    const response = NextResponse.json(authResponse)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}