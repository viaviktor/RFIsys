import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { format as formatDate } from 'date-fns'

// POST /api/admin/stakeholders/[id]/export - Export stakeholder data (admin only)
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

    // Get the target stakeholder's complete data
    const targetContact = await prisma.contact.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        projectStakeholders: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
                status: true,
                createdAt: true,
              }
            }
          }
        }
      }
    })

    if (!targetContact) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 })
    }

    if (!targetContact.role || !['STAKEHOLDER_L1', 'STAKEHOLDER_L2'].includes(targetContact.role)) {
      return NextResponse.json({ error: 'Contact is not a stakeholder' }, { status: 400 })
    }

    // Get email interactions
    const emailInteractions = await prisma.emailLog.findMany({
      where: { recipientEmail: targetContact.email },
      select: {
        id: true,
        subject: true,
        emailType: true,
        success: true,
        sentAt: true,
        rfiId: true,
        rfi: {
          select: {
            rfiNumber: true,
            title: true,
          }
        }
      },
      orderBy: { sentAt: 'desc' },
      take: 100, // Limit to last 100 interactions
    })

    // Get access requests
    const accessRequests = await prisma.accessRequest.findMany({
      where: { contactId: targetContact.id },
      select: {
        id: true,
        status: true,
        requestedRole: true,
        createdAt: true,
        processedAt: true,
        project: {
          select: {
            name: true,
            projectNumber: true,
          }
        }
      }
    })

    // Get registration tokens
    const registrationTokens = await prisma.registrationToken.findMany({
      where: { contactId: targetContact.id },
      select: {
        id: true,
        tokenType: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
      }
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      exportType: 'admin_stakeholder_export',
      
      personalData: {
        id: targetContact.id,
        name: targetContact.name,
        email: targetContact.email,
        phone: targetContact.phone,
        title: targetContact.title,
        role: targetContact.role,
        emailVerified: targetContact.emailVerified,
        registrationEligible: targetContact.registrationEligible,
        createdAt: targetContact.createdAt,
        updatedAt: targetContact.updatedAt,
        lastLogin: targetContact.lastLogin,
        hasActiveAccount: targetContact.password !== null,
        client: targetContact.client,
      },
      
      activityData: {
        projectAssignments: targetContact.projectStakeholders.map(ps => ({
          projectId: ps.project.id,
          projectName: ps.project.name,
          projectNumber: ps.project.projectNumber,
          projectStatus: ps.project.status,
          stakeholderLevel: ps.stakeholderLevel,
          assignedAt: ps.createdAt,
          autoApproved: ps.autoApproved,
        })),
        emailInteractions: emailInteractions.map(ei => ({
          id: ei.id,
          subject: ei.subject,
          emailType: ei.emailType,
          success: ei.success,
          sentAt: ei.sentAt,
          rfiNumber: ei.rfi?.rfiNumber,
          rfiTitle: ei.rfi?.title,
        })),
        accessRequests: accessRequests.map(ar => ({
          id: ar.id,
          status: ar.status,
          requestedRole: ar.requestedRole,
          projectName: ar.project?.name,
          projectNumber: ar.project?.projectNumber,
          createdAt: ar.createdAt,
          processedAt: ar.processedAt,
        })),
        registrationHistory: registrationTokens.map(rt => ({
          id: rt.id,
          tokenType: rt.tokenType,
          createdAt: rt.createdAt,
          expiresAt: rt.expiresAt,
          usedAt: rt.usedAt,
          wasUsed: rt.usedAt !== null,
        })),
      },
      
      statistics: {
        totalProjectAssignments: targetContact.projectStakeholders.length,
        totalEmailInteractions: emailInteractions.length,
        totalAccessRequests: accessRequests.length,
        totalRegistrationAttempts: registrationTokens.length,
        accountStatus: targetContact.password ? 'Active' : 'Inactive',
      },
      
      adminNotes: {
        exportReason: 'Administrative stakeholder data export',
        privacyCompliance: 'GDPR/CCPA compliant export',
        dataRetention: 'Export includes last 100 email interactions only',
        stakeholderLevel: targetContact.role === 'STAKEHOLDER_L1' ? 'Level 1 - Client Administrator' : 'Level 2 - Sub-contractor',
      }
    }

    // Log the export for audit
    console.log(`📊 Admin stakeholder export by ${user.email} for: ${targetContact.email} (${targetContact.role}) at ${targetContact.client?.name}`)

    const response = NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="admin-stakeholder-export-${targetContact.email}-${formatDate(new Date(), 'yyyy-MM-dd')}.json"`,
      },
    })
    
    return response
  } catch (error) {
    console.error('Admin stakeholder export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}