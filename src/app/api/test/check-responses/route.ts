import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rfiId = searchParams.get('rfiId')
    
    if (!rfiId) {
      const allResponses = await prisma.response.findMany({
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          rfi: {
            select: {
              id: true,
              rfiNumber: true,
              title: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
      
      return NextResponse.json({
        message: 'Recent responses from database',
        count: allResponses.length,
        responses: allResponses
      })
    }
    
    const responses = await prisma.response.findMany({
      where: { rfiId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      message: `Responses for RFI ${rfiId}`,
      rfiId,
      count: responses.length,
      responses
    })
    
  } catch (error) {
    console.error('Error checking responses:', error)
    return NextResponse.json({
      error: 'Failed to check responses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}