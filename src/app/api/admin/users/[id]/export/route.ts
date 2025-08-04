import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { format as formatDate } from 'date-fns'

// POST /api/admin/users/[id]/export - Export user data (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.userType !== 'internal' || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Get the target user's complete data
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        rfisCreated: {
          select: {
            id: true,
            rfiNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            client: {
              select: {
                name: true,
              }
            },
            project: {
              select: {
                name: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to last 100 RFIs
        },
        responses: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            rfi: {
              select: {
                rfiNumber: true,
                title: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to last 100 responses
        },
        projects: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            status: true,
            createdAt: true,
            client: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      exportType: 'admin_user_export',
      
      personalData: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        active: targetUser.active,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
      
      activityData: {
        rfisCreated: targetUser.rfisCreated,
        responses: targetUser.responses,
        managedProjects: targetUser.projects,
      },
      
      statistics: {
        totalRfisCreated: targetUser.rfisCreated.length,
        totalResponses: targetUser.responses.length,
        totalProjectsManaged: targetUser.projects.length,
      },
      
      adminNotes: {
        exportReason: 'Administrative data export',
        privacyCompliance: 'GDPR/CCPA compliant export',
        dataRetention: 'Export includes last 100 RFIs and responses only',
      }
    }

    // Log the export for audit
    console.log(`📊 Admin data export by ${user.email} for user: ${targetUser.email}`)

    const response = NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="admin-user-export-${targetUser.email}-${formatDate(new Date(), 'yyyy-MM-dd')}.json"`,
      },
    })
    
    return response
  } catch (error) {
    console.error('Admin user export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}