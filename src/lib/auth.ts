import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const SALT_ROUNDS = 10

export interface JWTPayload {
  userId: string
  email: string
  role: string
  userType?: 'internal' | 'stakeholder'
  projectAccess?: string[]
  canInvite?: boolean
  iat?: number
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token)
  if (!payload) return null

  // Check if it's a stakeholder user
  if (payload.userType === 'stakeholder') {
    const contact = await prisma.contact.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLogin: true,
        projectStakeholders: {
          select: {
            projectId: true,
            stakeholderLevel: true,
          }
        }
      },
    })

    if (!contact || !contact.active) return null

    return {
      ...contact,
      userType: 'stakeholder' as const,
      projectAccess: contact.projectStakeholders.map(ps => ps.projectId),
      canInvite: contact.role === 'STAKEHOLDER_L1',
    }
  }

  // Internal user
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  })

  if (!user || !user.active) return null

  return {
    ...user,
    userType: 'internal' as const,
    canInvite: true,
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try to get token from cookie (for httpOnly cookies)
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

export async function authenticateRequest(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return null

  return getUserFromToken(token)
}

export function createAuthResponse(user: any, token: string) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType,
      contactId: user.contactId,
      projectAccess: user.projectAccess,
      active: user.active
    },
    token,
  }
}

// Export auth as an alias for authenticateRequest for compatibility
export const auth = authenticateRequest