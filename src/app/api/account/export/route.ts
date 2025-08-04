import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { z } from 'zod'
import { format as formatDate } from 'date-fns'

const dataExportSchema = z.object({
  includePersonalData: z.boolean().default(true),
  includeActivityData: z.boolean().default(true),
  includeSystemLogs: z.boolean().default(false),
  format: z.enum(['json', 'csv']).default('json'),
})

// Convert object to CSV format
function objectToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )
  ]
  
  return csvRows.join('\n')
}

// POST /api/account/export - Export user data (GDPR/CCPA compliance)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { includePersonalData, includeActivityData, includeSystemLogs, format } = dataExportSchema.parse(body)

    const exportData: any = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      userType: user.userType,
      dataIncluded: {
        personalData: includePersonalData,
        activityData: includeActivityData,
        systemLogs: includeSystemLogs,
      }
    }

    if (user.userType === 'stakeholder') {
      // Export stakeholder data
      const contact = await prisma.contact.findUnique({
        where: { id: user.contactId! },
        include: {
          client: true,
          projectStakeholders: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  projectNumber: true,
                  createdAt: true,
                }
              }
            }
          }
        }
      })

      if (!contact) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (includePersonalData) {
        exportData.personalData = {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
          role: contact.role,
          emailVerified: contact.emailVerified,
          registrationEligible: contact.registrationEligible,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
          lastLogin: contact.lastLogin,
          client: {
            id: contact.client.id,
            name: contact.client.name,
          }
        }
      }

      if (includeActivityData) {
        exportData.activityData = {
          projectAssignments: contact.projectStakeholders.map(ps => ({
            projectId: ps.project.id,
            projectName: ps.project.name,
            projectNumber: ps.project.projectNumber,
            stakeholderLevel: ps.stakeholderLevel,
            assignedAt: ps.createdAt,
            autoApproved: ps.autoApproved,
          })),
          // Get email logs if any
          emailInteractions: await prisma.emailLog.findMany({
            where: { recipientEmail: contact.email },
            select: {
              id: true,
              subject: true,
              emailType: true,
              success: true,
              sentAt: true,
              rfiId: true,
            },
            orderBy: { sentAt: 'desc' },
            take: 100, // Limit to last 100 interactions
          })
        }
      }

      if (includeSystemLogs && user.role === 'ADMIN') {
        // Only admins can export system logs
        exportData.systemLogs = {
          accessRequests: await prisma.accessRequest.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              status: true,
              requestedRole: true,
              createdAt: true,
              processedAt: true,
            }
          }),
          registrationTokens: await prisma.registrationToken.findMany({
            where: { contactId: contact.id },
            select: {
              id: true,
              tokenType: true,
              createdAt: true,
              expiresAt: true,
              usedAt: true,
            }
          })
        }
      }
    } else {
      // Export internal user data
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
          rfisCreated: {
            select: {
              id: true,
              rfiNumber: true,
              title: true,
              status: true,
              createdAt: true,
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
            }
          }
        }
      })

      if (!internalUser) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (includePersonalData) {
        exportData.personalData = {
          id: internalUser.id,
          name: internalUser.name,
          email: internalUser.email,
          role: internalUser.role,
          active: internalUser.active,
          createdAt: internalUser.createdAt,
          updatedAt: internalUser.updatedAt,
        }
      }

      if (includeActivityData) {
        exportData.activityData = {
          rfisCreated: internalUser.rfisCreated,
          responses: internalUser.responses,
          managedProjects: internalUser.projects,
        }
      }

      if (includeSystemLogs && user.role === 'ADMIN') {
        // System logs for internal users
        exportData.systemLogs = {
          note: 'System logs for internal users are maintained in application logs'
        }
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      let csvContent = ''
      
      if (includePersonalData && exportData.personalData) {
        csvContent += 'PERSONAL DATA\n'
        csvContent += objectToCSV([exportData.personalData]) + '\n\n'
      }
      
      if (includeActivityData && exportData.activityData) {
        csvContent += 'ACTIVITY DATA\n'
        Object.entries(exportData.activityData).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            csvContent += `${key.toUpperCase()}\n`
            csvContent += objectToCSV(value) + '\n\n'
          }
        })
      }

      const response = new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="account-data-${user.email}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      })
      
      return response
    } else {
      // JSON format
      const response = NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="account-data-${user.email}-${formatDate(new Date(), 'yyyy-MM-dd')}.json"`,
        },
      })
      
      return response
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}