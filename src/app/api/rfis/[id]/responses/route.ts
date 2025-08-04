import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

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
    // Check if RFI exists
    const rfi = await prisma.rFI.findUnique({
      where: { id },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Get responses with pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where: { rfiId: id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          authorContact: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.response.count({ where: { rfiId: id } }),
    ])

    return NextResponse.json({
      data: responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET responses error:', error)
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

    const { content } = await request.json()

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Response content is required' },
        { status: 400 }
      )
    }

    const { id } = await params
    // Check if RFI exists
    const rfi = await prisma.rFI.findUnique({
      where: { id },
    })

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 })
    }

    // Create response - handle both internal users and stakeholders
    const responseData: any = {
      content: content.trim(),
      rfiId: id,
    }
    
    // Determine if author is internal user or stakeholder
    if (user.userType === 'stakeholder' && user.contactId) {
      responseData.authorContactId = user.contactId
    } else {
      responseData.authorId = user.id
    }

    const response = await prisma.response.create({
      data: responseData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        authorContact: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        rfi: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}