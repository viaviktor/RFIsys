#!/usr/bin/env node

/**
 * Fix null Role values in contacts table
 * Sets all null roles to STAKEHOLDER_L1 (default)
 */

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Fixing null Role values in contacts table...')
    
    // Update all contacts with null role to STAKEHOLDER_L1
    const result = await prisma.$executeRaw`
      UPDATE contacts 
      SET role = 'STAKEHOLDER_L1'::text::"Role"
      WHERE role IS NULL
    `
    
    console.log(`✅ Updated ${result} contacts with null roles to STAKEHOLDER_L1`)
    
    // Verify no null roles remain
    const nullCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE role IS NULL
    `
    
    console.log(`📊 Contacts with null roles remaining: ${nullCount[0].count}`)
    
    if (nullCount[0].count > 0) {
      console.error('❌ Some null roles still exist!')
      process.exit(1)
    }
    
    console.log('🎉 All contacts now have valid Role values!')
    
  } catch (error) {
    console.error('❌ Error fixing null roles:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}