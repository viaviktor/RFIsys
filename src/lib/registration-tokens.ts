import { prisma } from './prisma'
import crypto from 'crypto'

export interface CreateRegistrationTokenParams {
  email: string
  contactId: string
  projectIds: string[]
  tokenType?: 'AUTO_APPROVED' | 'REQUESTED'
  expiresInDays?: number
}

export async function createRegistrationToken(params: CreateRegistrationTokenParams) {
  const {
    email,
    contactId,
    projectIds,
    tokenType = 'AUTO_APPROVED',
    expiresInDays = 7
  } = params

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex')
  
  // Calculate expiration date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Create the token record
  const registrationToken = await prisma.registrationToken.create({
    data: {
      token,
      email,
      contactId,
      projectIds,
      tokenType,
      expiresAt,
    },
  })

  return registrationToken
}

export async function validateRegistrationToken(token: string) {
  const registrationToken = await prisma.registrationToken.findUnique({
    where: { token },
    include: { contact: true },
  })

  if (!registrationToken) {
    return null
  }

  // Check if token is expired
  if (registrationToken.expiresAt < new Date()) {
    return null
  }

  // Check if token has already been used
  if (registrationToken.usedAt) {
    return null
  }

  return registrationToken
}

export async function markTokenAsUsed(token: string) {
  return prisma.registrationToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })
}

export async function generateRegistrationUrl(token: string, baseUrl?: string) {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${appUrl}/register?token=${token}`
}

export async function cleanupExpiredTokens() {
  // Delete tokens that expired more than 30 days ago
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)

  const result = await prisma.registrationToken.deleteMany({
    where: {
      expiresAt: { lt: cutoffDate },
    },
  })

  return result.count
}

export async function getContactRegistrationStatus(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      password: true,
      registrationEligible: true,
      registrationTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!contact) return null

  return {
    isRegistered: !!contact.password,
    isEligible: contact.registrationEligible,
    hasValidToken: contact.registrationTokens.length > 0,
    latestToken: contact.registrationTokens[0]?.token || null,
  }
}