import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, createAuthResponse } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, role = Role.USER, token } = await request.json()

    // Check if public registration is allowed
    const allowPublicRegistration = process.env.ALLOW_PUBLIC_REGISTRATION === 'true'
    
    if (!token && !allowPublicRegistration) {
      return NextResponse.json(
        { error: 'Public registration is disabled. Registration requires an invitation token.' },
        { status: 403 }
      )
    }

    // If token provided, validate it and extract contact info
    let contactData = null
    let projectAccess: string[] = []
    
    if (token) {
      // TODO: Implement token validation logic
      // For now, we'll add a placeholder
      const registrationToken = await prisma.registrationToken.findUnique({
        where: { token, usedAt: null },
        include: { contact: true }
      })
      
      if (!registrationToken || registrationToken.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Invalid or expired registration token' },
          { status: 400 }
        )
      }
      
      contactData = registrationToken.contact
      projectAccess = registrationToken.projectIds
      
      // Validate email matches token
      if (email !== contactData.email) {
        return NextResponse.json(
          { error: 'Email address must match invitation' },
          { status: 400 }
        )
      }
    }

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists (internal users table)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    // Check if contact already has password (stakeholder already registered)
    const existingContact = await prisma.contact.findFirst({
      where: { email, password: { not: null } },
    })

    if (existingUser || existingContact) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    let user
    
    if (contactData) {
      // Stakeholder registration - update existing contact
      user = await prisma.contact.update({
        where: { id: contactData.id },
        data: {
          password: hashedPassword,
          role: contactData.role || Role.STAKEHOLDER_L1,
          emailVerified: true,
          registrationEligible: true,
        },
      })
      
      // Mark token as used
      await prisma.registrationToken.update({
        where: { token },
        data: { usedAt: new Date() }
      })
    } else {
      // Internal user registration (if public registration is enabled)
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
        },
      })
    }

    // Create JWT token
    const jwtToken = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      userType: contactData ? 'stakeholder' : 'internal',
      projectAccess: contactData ? projectAccess : undefined,
    })

    // Create response
    const authResponse = createAuthResponse(user, jwtToken)

    // Set httpOnly cookie
    const response = NextResponse.json(authResponse, { status: 201 })
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}