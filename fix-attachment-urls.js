#!/usr/bin/env node

/**
 * Fix attachment URLs in database
 * This script updates existing attachment records to use the correct API URL format
 */

const { PrismaClient } = require('@prisma/client')

async function fixAttachmentUrls() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Connecting to database...')
    
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
      console.log('No attachments need fixing!')
      return
    }
    
    // Update each attachment
    let fixed = 0
    for (const attachment of incorrectAttachments) {
      const newUrl = `/api/uploads/${attachment.storedName}`
      
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { url: newUrl }
      })
      
      console.log(`Fixed: ${attachment.url} -> ${newUrl}`)
      fixed++
    }
    
    console.log(`Successfully fixed ${fixed} attachment URLs`)
    
  } catch (error) {
    console.error('Error fixing attachment URLs:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixAttachmentUrls().catch(console.error)