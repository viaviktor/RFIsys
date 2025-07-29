import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { type, format = 'json', filters = {} } = await request.json()

    if (!type) {
      return NextResponse.json(
        { error: 'Export type is required' },
        { status: 400 }
      )
    }

    let data: any = null
    let filename = ''

    switch (type) {
      case 'users':
        data = await prisma.user.findMany({
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
          orderBy: { createdAt: 'asc' }
        })
        filename = `users-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'clients':
        data = await prisma.client.findMany({
          include: {
            _count: {
              select: {
                projects: true,
                rfis: true,
                contacts: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        })
        filename = `clients-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'projects':
        data = await prisma.project.findMany({
          include: {
            client: {
              select: {
                id: true,
                name: true,
                contactName: true,
                email: true,
              }
            },
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            _count: {
              select: {
                rfis: true,
                stakeholders: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        })
        filename = `projects-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'rfis':
        const where: any = {}
        
        if (filters.status) where.status = filters.status
        if (filters.priority) where.priority = filters.priority
        if (filters.clientId) where.clientId = filters.clientId
        if (filters.projectId) where.projectId = filters.projectId
        if (filters.dateFrom || filters.dateTo) {
          where.createdAt = {}
          if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
          if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo)
        }

        data = await prisma.rFI.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                contactName: true,
                email: true,
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            responses: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            attachments: {
              select: {
                id: true,
                filename: true,
                size: true,
                mimeType: true,
                createdAt: true,
              }
            },
            _count: {
              select: {
                responses: true,
                attachments: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        })
        filename = `rfis-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'full-backup':
        // Export everything for full backup
        data = {
          users: await prisma.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              active: true,
              createdAt: true,
              updatedAt: true,
            }
          }),
          clients: await prisma.client.findMany(),
          projects: await prisma.project.findMany(),
          rfis: await prisma.rFI.findMany({
            include: {
              responses: true,
              attachments: {
                select: {
                  id: true,
                  filename: true,
                  storedName: true,
                  url: true,
                  size: true,
                  mimeType: true,
                  description: true,
                  rfiId: true,
                  uploadedBy: true,
                  createdAt: true,
                }
              },
              emailLogs: true,
            }
          }),
          contacts: await prisma.contact.findMany(),
          projectStakeholders: await prisma.projectStakeholder.findMany(),
          settings: await prisma.settings.findMany(),
          exportedAt: new Date().toISOString(),
          exportedBy: user.id,
        }
        filename = `full-backup-${new Date().toISOString().split('T')[0]}`
        break

      case 'settings':
        data = await prisma.settings.findMany({
          orderBy: { key: 'asc' }
        })
        filename = `settings-export-${new Date().toISOString().split('T')[0]}`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data found to export' },
        { status: 404 }
      )
    }

    let content: string
    let contentType: string
    let fileExtension: string

    if (format === 'csv' && Array.isArray(data)) {
      // Convert to CSV
      if (data.length === 0) {
        content = ''
      } else {
        const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object')
        const rows = data.map(item => 
          headers.map(header => {
            const value = item[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return String(value)
          }).join(',')
        )
        content = [headers.join(','), ...rows].join('\n')
      }
      contentType = 'text/csv'
      fileExtension = 'csv'
    } else {
      // Default to JSON
      content = JSON.stringify(data, null, 2)
      contentType = 'application/json'
      fileExtension = 'json'
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`)
    headers.set('Content-Length', Buffer.byteLength(content, 'utf8').toString())

    return new NextResponse(content, { headers })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}