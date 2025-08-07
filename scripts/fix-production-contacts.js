#!/usr/bin/env node

/**
 * Fix Production Contact Soft Delete Issue
 * 
 * This script can be run on production to fix contacts that were deleted
 * with the old method (active=false only) but don't have deletedAt set.
 */

const { PrismaClient } = require('@prisma/client')

async function fixProductionContacts() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Starting production contact soft-delete fix...')
    console.log('🔗 Database URL:', process.env.DATABASE_URL?.replace(/:([^:@]*@)/, ':***@'))
    
    // Find contacts that were deleted the old way
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
    
    console.log(`📊 Found ${brokenContacts.length} contacts needing fixing`)
    
    if (brokenContacts.length === 0) {
      console.log('✅ No contacts need fixing')
      return { fixed: 0, failed: 0 }
    }
    
    console.log('\n📋 Contacts to fix:')
    brokenContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} (${contact.email})`)
      console.log(`   Client: ${contact.client.name}`)
      console.log(`   Last updated: ${contact.updatedAt}`)
    })
    
    const confirmation = process.env.CONFIRM_FIX === 'true'
    if (!confirmation) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made')
      console.log('Set CONFIRM_FIX=true environment variable to apply changes')
      return { fixed: 0, failed: 0 }
    }
    
    console.log(`\n🔧 Updating ${brokenContacts.length} contacts...`)
    
    const results = await Promise.allSettled(
      brokenContacts.map(contact =>
        prisma.contact.update({
          where: { id: contact.id },
          data: {
            deletedAt: contact.updatedAt // Use their last update time as deletion time
          }
        })
      )
    )
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected')
    
    console.log(`✅ Successfully fixed ${successful} contacts`)
    
    if (failed.length > 0) {
      console.log(`❌ Failed to fix ${failed.length} contacts:`)
      failed.forEach((result, index) => {
        if (result.status === 'rejected') {
          const contact = brokenContacts[results.indexOf(result)]
          console.log(`   ${contact.email}: ${result.reason}`)
        }
      })
    }
    
    // Verify the fix
    const remainingBroken = await prisma.contact.count({
      where: {
        active: false,
        deletedAt: null
      }
    })
    
    console.log(`\n📈 Remaining broken contacts: ${remainingBroken}`)
    
    if (remainingBroken === 0) {
      console.log('🎉 All contacts now have consistent soft-delete state!')
    }
    
    return { fixed: successful, failed: failed.length }
    
  } catch (error) {
    console.error('❌ Error fixing production contacts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixProductionContacts()
    .then((result) => {
      console.log(`\n🏁 Fix completed: ${result.fixed} fixed, ${result.failed} failed`)
      process.exit(result.failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error)
      process.exit(1)
    })
}

module.exports = { fixProductionContacts }