#!/usr/bin/env node

/**
 * Fix Contact Soft Delete Migration
 * 
 * Problem: Contacts were previously "deleted" by setting active=false only.
 * The deletedAt field was not set, so client deletion dependency checks still count them.
 * 
 * Solution: Update all inactive contacts to have proper deletedAt timestamps.
 */

const { PrismaClient } = require('@prisma/client')

async function fixContactSoftDelete() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Checking for contacts with active=false but deletedAt=null...')
    
    // Find contacts that were deleted the old way (active=false but deletedAt=null)
    const brokenContacts = await prisma.contact.findMany({
      where: {
        active: false,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        clientId: true,
        updatedAt: true,
        client: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${brokenContacts.length} contacts with inconsistent soft-delete state`)
    
    if (brokenContacts.length === 0) {
      console.log('✅ No contacts need fixing')
      return
    }
    
    // Show what we found
    console.log('\n📋 Contacts to fix:')
    brokenContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} (${contact.email}) - Client: ${contact.client.name}`)
      console.log(`   Last updated: ${contact.updatedAt}`)
    })
    
    console.log(`\n🔧 Updating ${brokenContacts.length} contacts to have proper deletedAt timestamps...`)
    
    // Update all these contacts to have deletedAt set to their updatedAt time
    // (assuming they were "deleted" when they were last updated)
    const updateResults = await Promise.allSettled(
      brokenContacts.map(contact =>
        prisma.contact.update({
          where: { id: contact.id },
          data: {
            deletedAt: contact.updatedAt // Use their last update time as deletion time
          }
        })
      )
    )
    
    const successful = updateResults.filter(r => r.status === 'fulfilled').length
    const failed = updateResults.filter(r => r.status === 'rejected').length
    
    console.log(`✅ Successfully updated ${successful} contacts`)
    if (failed > 0) {
      console.log(`❌ Failed to update ${failed} contacts`)
      updateResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`   Failed: ${brokenContacts[index].email} - ${result.reason}`)
        }
      })
    }
    
    // Verify the fix
    const remainingBrokenContacts = await prisma.contact.count({
      where: {
        active: false,
        deletedAt: null
      }
    })
    
    if (remainingBrokenContacts === 0) {
      console.log('🎉 All contacts now have consistent soft-delete state!')
    } else {
      console.log(`⚠️  Still ${remainingBrokenContacts} contacts with inconsistent state`)
    }
    
    // Show current counts
    const totalContacts = await prisma.contact.count()
    const activeContacts = await prisma.contact.count({ where: { active: true, deletedAt: null } })
    const softDeletedContacts = await prisma.contact.count({ where: { deletedAt: { not: null } } })
    
    console.log('\n📊 Final contact counts:')
    console.log(`   Total: ${totalContacts}`)
    console.log(`   Active: ${activeContacts}`)
    console.log(`   Soft-deleted: ${softDeletedContacts}`)
    
  } catch (error) {
    console.error('❌ Error fixing contact soft-delete:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixContactSoftDelete()
    .then(() => {
      console.log('🏁 Contact soft-delete fix completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Contact soft-delete fix failed:', error)
      process.exit(1)
    })
}

module.exports = { fixContactSoftDelete }