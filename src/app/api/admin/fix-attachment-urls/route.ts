import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting attachment URL fix...')
    
    // Find all attachments with incorrect URL format
    const incorrectAttachments = await prisma.attachment.findMany({
      where: {
        url: {
          startsWith: '/uploads/'
        }
      },
      select: {
        id: true,
        url: true,
        storedName: true
      }
    })
    
    console.log(`Found ${incorrectAttachments.length} attachments with incorrect URLs`)
    
    if (incorrectAttachments.length === 0) {
      return NextResponse.json({ 
        message: 'No attachments need fixing!',
        fixed: 0
      })
    }
    
    // Update each attachment
    const updates = []
    for (const attachment of incorrectAttachments) {
      const newUrl = `/api/uploads/${attachment.storedName}`
      
      const updatePromise = prisma.attachment.update({
        where: { id: attachment.id },
        data: { url: newUrl }
      })
      
      updates.push(updatePromise)
      console.log(`Fixing: ${attachment.url} -> ${newUrl}`)
    }
    
    // Execute all updates
    await Promise.all(updates)
    
    console.log(`Successfully fixed ${incorrectAttachments.length} attachment URLs`)
    
    return NextResponse.json({
      message: `Successfully fixed ${incorrectAttachments.length} attachment URLs`,
      fixed: incorrectAttachments.length,
      examples: incorrectAttachments.slice(0, 3).map(a => ({
        old: a.url,
        new: `/api/uploads/${a.storedName}`
      }))
    })
    
  } catch (error) {
    console.error('Error fixing attachment URLs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}