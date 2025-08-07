import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { markAsDeleted } from '@/lib/soft-delete'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('GET contact error:', error)
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const {
      name,
      email,
      phone,
      title,
      active,
    } = await request.json()

    // Validate required fields if provided
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    if (email !== undefined) {
      if (!email) {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
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

      // Check if email already exists for this client (excluding current contact and soft-deleted)
      const existingContact = await prisma.contact.findFirst({
        where: {
          clientId: contact.clientId,
          email,
          deletedAt: null, // Only check non-deleted contacts
          id: { not: contactId },
        },
      })

      if (existingContact) {
        return NextResponse.json(
          { error: 'A contact with this email already exists for this client' },
          { status: 409 }
        )
      }
    }


    // Update contact
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(title !== undefined && { title }),
        ...(active !== undefined && { active }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedContact)
  } catch (error) {
    console.error('PUT contact error:', error)
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Proper soft delete using markAsDeleted
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...markAsDeleted(),
        active: false, // Also deactivate for immediate effect
      },
    })

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('DELETE contact error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}