#!/usr/bin/env node

/**
 * Debug Client Contact Deletion Issue
 * 
 * Investigates why a specific client cannot be deleted due to "has contacts" error
 */

const { PrismaClient } = require('@prisma/client')

async function debugClientContacts(clientId = 'cmdqugehe0005xz48p0y71c24') {
  const prisma = new PrismaClient()
  
  try {
    console.log(`🔍 Debugging client: ${clientId}`)
    
    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        active: true,
        deletedAt: true
      }
    })
    
    if (!client) {
      console.log('❌ Client not found')
      return
    }
    
    console.log('📋 Client details:')
    console.log(`   Name: ${client.name}`)
    console.log(`   Active: ${client.active}`)
    console.log(`   DeletedAt: ${client.deletedAt}`)
    
    // Check ALL contacts for this client (including deleted ones)
    console.log('\n🔍 All contacts for this client:')
    const allContacts = await prisma.contact.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        deletedAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    console.log(`📊 Found ${allContacts.length} total contacts`)
    
    allContacts.forEach((contact, index) => {
      const status = contact.deletedAt 
        ? '🗑️ SOFT-DELETED' 
        : contact.active 
          ? '✅ ACTIVE' 
          : '❌ INACTIVE'
      
      console.log(`${index + 1}. ${contact.name} (${contact.email})`)
      console.log(`   Status: ${status}`)
      console.log(`   Active: ${contact.active}, DeletedAt: ${contact.deletedAt}`)
      console.log(`   Last updated: ${contact.updatedAt}`)
      console.log()
    })
    
    // Show the counts that the deletion endpoint would see
    const counts = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        _count: {
          select: {
            projects: {
              where: {
                deletedAt: null, // Only count non-deleted projects
              },
            },
            rfis: {
              where: {
                deletedAt: null, // Only count non-deleted RFIs
              },
            },
            contacts: {
              where: {
                deletedAt: null, // Only count non-deleted contacts
              },
            },
          },
        },
      },
    })
    
    console.log('🔢 Dependency counts (as seen by DELETE endpoint):')
    console.log(`   Projects: ${counts._count.projects}`)
    console.log(`   RFIs: ${counts._count.rfis}`)
    console.log(`   Contacts: ${counts._count.contacts}`)
    
    // If contacts count > 0, show which ones are being counted
    if (counts._count.contacts > 0) {
      console.log('\n⚠️ These contacts are preventing deletion:')
      const blockingContacts = await prisma.contact.findMany({
        where: {
          clientId,
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          deletedAt: true
        }
      })
      
      blockingContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name} (${contact.email})`)
        console.log(`   Active: ${contact.active}, DeletedAt: ${contact.deletedAt}`)
      })
    }
    
    // Check if there are any project stakeholders referencing this client's contacts
    const stakeholders = await prisma.projectStakeholder.findMany({
      where: {
        contact: {
          clientId
        }
      },
      include: {
        contact: {
          select: {
            name: true,
            email: true,
            active: true,
            deletedAt: true
          }
        },
        project: {
          select: {
            name: true,
            deletedAt: true
          }
        }
      }
    })
    
    if (stakeholders.length > 0) {
      console.log('\n👥 Project stakeholder relationships:')
      stakeholders.forEach((stakeholder, index) => {
        console.log(`${index + 1}. Contact: ${stakeholder.contact.name}`)
        console.log(`   Project: ${stakeholder.project.name}`)
        console.log(`   Contact active: ${stakeholder.contact.active}, deletedAt: ${stakeholder.contact.deletedAt}`)
        console.log(`   Project deletedAt: ${stakeholder.project.deletedAt}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error debugging client contacts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const clientId = process.argv[2] || 'cmdqugehe0005xz48p0y71c24'
  debugClientContacts(clientId)
    .then(() => {
      console.log('🏁 Debug completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error)
      process.exit(1)
    })
}

module.exports = { debugClientContacts }