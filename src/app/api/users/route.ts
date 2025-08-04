import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, hashPassword } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const active = searchParams.get('active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build where clauses for both users and contacts
    const userWhere: any = {}
    const contactWhere: any = {
      password: { not: null }, // Only include contacts with passwords (registered stakeholders)
      role: { in: ['STAKEHOLDER_L1', 'STAKEHOLDER_L2'] }, // Only include valid stakeholder roles
    }
    
    if (role && Object.values(Role).includes(role as Role)) {
      if (['USER', 'MANAGER', 'ADMIN'].includes(role)) {
        userWhere.role = role as Role
        // Don't include contacts for internal roles
        contactWhere.role = 'NEVER_MATCH' // This will exclude all contacts
      } else if (['STAKEHOLDER_L1', 'STAKEHOLDER_L2'].includes(role)) {
        contactWhere.role = role as Role
        // Don't include users for stakeholder roles
        userWhere.role = 'NEVER_MATCH' // This will exclude all users
      }
    }

    if (active !== null) {
      const isActive = active === 'true'
      userWhere.active = isActive
      // For contacts, we'll consider them active if they have a password (are registered)
      if (!isActive) {
        contactWhere.password = null // Show unregistered contacts as inactive
      }
    }

    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' }},
        { email: { contains: search, mode: 'insensitive' }}
      ]
      contactWhere.OR = [
        { name: { contains: search, mode: 'insensitive' }},
        { email: { contains: search, mode: 'insensitive' }}
      ]
    }

    // Get users from users table
    const users = await prisma.user.findMany({
      where: userWhere,
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
      },
    })

    // Get stakeholders from contacts table with error handling
    let stakeholders: any[] = []
    try {
      stakeholders = await prisma.contact.findMany({
        where: contactWhere,
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
                  name: true
                }
              }
            }
          }
        },
      })
    } catch (contactError: any) {
      console.warn('Failed to fetch contacts, using empty array:', contactError?.message)
      stakeholders = []
    }

    // Transform stakeholders to match user format
    const transformedStakeholders = stakeholders.map(stakeholder => ({
      id: stakeholder.id,
      name: stakeholder.name,
      email: stakeholder.email,
      role: stakeholder.role,
      active: stakeholder.password !== null, // Active if they have a password (registered)
      createdAt: stakeholder.createdAt,
      updatedAt: stakeholder.updatedAt,
      userType: 'stakeholder' as const,
      clientName: stakeholder.client?.name,
      projectCount: stakeholder.projectStakeholders.length,
      _count: {
        rfisCreated: 0, // Stakeholders don't create RFIs
        responses: 0, // TODO: Could count email responses if needed
        projects: stakeholder.projectStakeholders.length,
      }
    }))

    // Transform users to include userType
    const transformedUsers = users.map(user => ({
      ...user,
      userType: 'internal' as const,
    }))

    // Combine and sort all users
    const allUsers = [...transformedUsers, ...transformedStakeholders]
    
    // Apply additional filtering if needed
    let filteredUsers = allUsers
    
    // Apply pagination to the combined result
    const total = filteredUsers.length
    const startIndex = (page - 1) * limit
    const paginatedUsers = filteredUsers
      .sort((a, b) => {
        // Sort by active status first, then by name
        if (a.active !== b.active) return b.active ? 1 : -1
        return a.name.localeCompare(b.name)
      })
      .slice(startIndex, startIndex + limit)

    return NextResponse.json({
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { name, email, password, role = 'USER' } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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
    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}