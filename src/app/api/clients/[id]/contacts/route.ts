import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { canViewClient } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: clientId } = await params

    // Check if user has access to this client
    const hasAccess = await canViewClient(user, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    // EMERGENCY FIX: Use query-level filtering to avoid Prisma enum serialization errors
    try {
      const contacts = await prisma.contact.findMany({
        where: {
          clientId,
          role: { in: ['USER', 'MANAGER', 'ADMIN', 'STAKEHOLDER_L1', 'STAKEHOLDER_L2'] }, // Only include valid roles
          deletedAt: null, // Only show non-deleted contacts
          ...(activeOnly && { active: true }),
        },
        orderBy: [
          { name: 'asc' },
        ],
      })

      return NextResponse.json({ data: contacts })
    } catch (prismaError: any) {
      // Fallback to raw SQL if Prisma still fails
      console.warn('Prisma contact query failed, using raw SQL fallback:', prismaError?.message || prismaError)
      
      let rawContacts
      if (activeOnly) {
        rawContacts = await prisma.$queryRaw`
          SELECT 
            id, name, email, phone, title, role, "clientId", active, 
            "createdAt", "updatedAt", password, "lastLogin", 
            "emailVerified", "registrationEligible"
          FROM contacts 
          WHERE "clientId" = ${clientId}
            AND role IS NOT NULL
            AND active = true
          ORDER BY name ASC
        `
      } else {
        rawContacts = await prisma.$queryRaw`
          SELECT 
            id, name, email, phone, title, role, "clientId", active, 
            "createdAt", "updatedAt", password, "lastLogin", 
            "emailVerified", "registrationEligible"
          FROM contacts 
          WHERE "clientId" = ${clientId}
            AND role IS NOT NULL
          ORDER BY name ASC
        `
      }
      
      return NextResponse.json({ data: rawContacts })
    }
  } catch (error) {
    console.error('GET contacts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: clientId } = await params

    // Check if user has access to this client
    const hasAccess = await canViewClient(user, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const {
      name,
      email,
      phone,
      title,
    } = await request.json()

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
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

    // Check if email already exists for this client
    const existingContact = await prisma.contact.findFirst({
      where: {
        clientId,
        email,
        active: true,
      },
    })

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this email already exists for this client' },
        { status: 409 }
      )
    }


    // Create contact
    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone,
        title,
        clientId,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('POST contact error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}