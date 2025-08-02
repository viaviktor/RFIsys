import { prisma } from './prisma'
import { Role } from '@prisma/client'

export interface UserWithAccess {
  id: string
  email: string
  name: string
  role: string
  userType: 'internal' | 'stakeholder'
  projectAccess?: string[]
  canInvite?: boolean
}

// Check if user has access to a specific project
export async function hasProjectAccess(user: UserWithAccess, projectId: string): Promise<boolean> {
  // Internal users (USER, MANAGER, ADMIN) have access to all projects
  if (user.userType === 'internal') {
    return true
  }

  // Stakeholders only have access to their assigned projects
  if (user.userType === 'stakeholder' && user.projectAccess) {
    return user.projectAccess.includes(projectId)
  }

  return false
}

// Get list of projects user has access to
export async function getUserProjects(user: UserWithAccess) {
  // Internal users see all projects
  if (user.userType === 'internal') {
    return prisma.project.findMany({
      include: {
        client: true,
        manager: true,
        _count: {
          select: {
            rfis: true,
            stakeholders: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Stakeholders only see their assigned projects
  if (user.userType === 'stakeholder' && user.projectAccess) {
    return prisma.project.findMany({
      where: {
        id: { in: user.projectAccess }
      },
      include: {
        client: true,
        manager: true,
        _count: {
          select: {
            rfis: true,
            stakeholders: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return []
}

// Get RFIs with project-based filtering
export async function getUserRFIs(user: UserWithAccess, filters?: any) {
  const baseWhere = filters || {}

  // Internal users see all RFIs
  if (user.userType === 'internal') {
    return prisma.rFI.findMany({
      where: baseWhere,
      include: {
        client: true,
        project: true,
        createdBy: true,
        _count: {
          select: {
            responses: true,
            attachments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Stakeholders only see RFIs from their projects
  if (user.userType === 'stakeholder' && user.projectAccess) {
    return prisma.rFI.findMany({
      where: {
        ...baseWhere,
        projectId: { in: user.projectAccess }
      },
      include: {
        client: true,
        project: true,
        createdBy: true,
        _count: {
          select: {
            responses: true,
            attachments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return []
}

// Check if user can view a specific RFI
export async function canViewRFI(user: UserWithAccess, rfiId: string): Promise<boolean> {
  // Internal users can view all RFIs
  if (user.userType === 'internal') {
    return true
  }

  // Check if RFI belongs to one of the user's projects
  if (user.userType === 'stakeholder' && user.projectAccess) {
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      select: { projectId: true }
    })

    if (rfi && user.projectAccess.includes(rfi.projectId)) {
      return true
    }
  }

  return false
}

// Check if user can view a specific client
export async function canViewClient(user: UserWithAccess, clientId: string): Promise<boolean> {
  // Internal users can view all clients
  if (user.userType === 'internal') {
    return true
  }

  // Stakeholders can only view clients that have projects they're assigned to
  if (user.userType === 'stakeholder' && user.projectAccess) {
    const projectsForClient = await prisma.project.findFirst({
      where: {
        clientId,
        id: { in: user.projectAccess }
      },
      select: { id: true }
    })

    return !!projectsForClient
  }

  return false
}

// Get clients with project-based filtering for stakeholders
export async function getUserClients(user: UserWithAccess) {
  // Internal users see all clients
  if (user.userType === 'internal') {
    return prisma.client.findMany({
      include: {
        _count: {
          select: {
            projects: true,
            rfis: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  // Stakeholders only see clients that have projects they're assigned to
  if (user.userType === 'stakeholder' && user.projectAccess) {
    const projects = await prisma.project.findMany({
      where: { id: { in: user.projectAccess } },
      select: { clientId: true }
    })

    const clientIds = [...new Set(projects.map(p => p.clientId))]

    return prisma.client.findMany({
      where: { id: { in: clientIds } },
      include: {
        _count: {
          select: {
            projects: {
              where: { id: { in: user.projectAccess } }
            },
            rfis: {
              where: { projectId: { in: user.projectAccess } }
            },
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  return []
}

// Get stakeholders for a project (with level-based filtering)
export async function getProjectStakeholders(user: UserWithAccess, projectId: string) {
  // First check if user has access to this project
  const hasAccess = await hasProjectAccess(user, projectId)
  if (!hasAccess) {
    return []
  }

  // Internal users and L1 stakeholders see all stakeholders
  if (user.userType === 'internal' || user.role === 'STAKEHOLDER_L1') {
    return prisma.projectStakeholder.findMany({
      where: { projectId },
      include: {
        contact: {
          include: {
            client: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedByContact: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // L2 stakeholders only see themselves and who invited them
  if (user.role === 'STAKEHOLDER_L2') {
    const myStakeholderRecord = await prisma.projectStakeholder.findFirst({
      where: {
        projectId,
        contact: { email: user.email }
      },
      select: { addedByContactId: true }
    })

    if (!myStakeholderRecord) {
      return []
    }

    // Get self and the L1 who invited them
    return prisma.projectStakeholder.findMany({
      where: {
        projectId,
        OR: [
          { contact: { email: user.email } },
          { contactId: myStakeholderRecord.addedByContactId || undefined }
        ]
      },
      include: {
        contact: {
          include: {
            client: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedByContact: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  }

  return []
}

// Check if user can invite stakeholders to a project
export function canInviteStakeholders(user: UserWithAccess, projectId: string): boolean {
  // Internal users can always invite
  if (user.userType === 'internal') {
    return true
  }

  // L1 stakeholders can invite to their assigned projects
  if (user.role === 'STAKEHOLDER_L1' && user.projectAccess?.includes(projectId)) {
    return true
  }

  // L2 stakeholders cannot invite
  return false
}

// Filter query results based on user permissions
export function applyProjectFilter(query: any, user: UserWithAccess, projectField = 'projectId') {
  if (user.userType === 'internal') {
    return query // No filtering for internal users
  }

  if (user.userType === 'stakeholder' && user.projectAccess) {
    return {
      ...query,
      where: {
        ...query.where,
        [projectField]: { in: user.projectAccess }
      }
    }
  }

  // No access
  return {
    ...query,
    where: {
      ...query.where,
      id: 'no-access' // This will return no results
    }
  }
}