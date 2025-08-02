#!/usr/bin/env node

/**
 * Emergency Role Enum Fix Script
 * Handles the enum update with proper transaction separation for PostgreSQL
 */

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚨 Starting emergency Role enum fix...')
    
    // Step 1: Check current enum values
    console.log('📋 Checking current Role enum values...')
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'Role'
      )
      ORDER BY enumsortorder
    `
    
    const currentValues = enumValues.map(v => v.enumlabel)
    console.log('Current enum values:', currentValues)
    
    const hasStakeholderL1 = currentValues.includes('STAKEHOLDER_L1')
    const hasStakeholderL2 = currentValues.includes('STAKEHOLDER_L2')
    
    // Step 2: Add missing enum values if needed (must be in separate transactions)
    if (!hasStakeholderL1) {
      console.log('➕ Adding STAKEHOLDER_L1 enum value...')
      try {
        await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE 'STAKEHOLDER_L1'`
        console.log('✅ Added STAKEHOLDER_L1')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ STAKEHOLDER_L1 already exists')
        } else {
          throw error
        }
      }
    }
    
    if (!hasStakeholderL2) {
      console.log('➕ Adding STAKEHOLDER_L2 enum value...')
      try {
        await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE 'STAKEHOLDER_L2'`
        console.log('✅ Added STAKEHOLDER_L2')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ STAKEHOLDER_L2 already exists')
        } else {
          throw error
        }
      }
    }
    
    // Step 3: Update null roles (in separate operation)
    console.log('🔧 Checking for null roles in contacts...')
    const nullRoleCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE role IS NULL
    `
    
    if (nullRoleCount[0].count > 0) {
      console.log(`❌ Found ${nullRoleCount[0].count} contacts with null roles`)
      console.log('🔧 Updating null roles to STAKEHOLDER_L1...')
      
      // Use a simple update that doesn't rely on enum casting
      const updateResult = await prisma.$executeRaw`
        UPDATE contacts 
        SET role = 'STAKEHOLDER_L1'
        WHERE role IS NULL
      `
      
      console.log(`✅ Updated ${updateResult} contacts to have STAKEHOLDER_L1 role`)
    } else {
      console.log('✅ All contacts have valid Role values')
    }
    
    // Step 4: Verify the fix
    console.log('🔍 Verifying the fix...')
    const verification = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles,
        COUNT(CASE WHEN role = 'STAKEHOLDER_L1' THEN 1 END) as stakeholder_l1,
        COUNT(CASE WHEN role = 'STAKEHOLDER_L2' THEN 1 END) as stakeholder_l2,
        COUNT(CASE WHEN role = 'USER' THEN 1 END) as users,
        COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as managers,
        COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
      FROM contacts
    `
    
    const stats = verification[0]
    console.log('📊 Contact role statistics:')
    console.log(`  Total contacts: ${stats.total_contacts}`)
    console.log(`  Null roles: ${stats.null_roles}`)
    console.log(`  STAKEHOLDER_L1: ${stats.stakeholder_l1}`)
    console.log(`  STAKEHOLDER_L2: ${stats.stakeholder_l2}`)
    console.log(`  USER: ${stats.users}`)
    console.log(`  MANAGER: ${stats.managers}`)
    console.log(`  ADMIN: ${stats.admins}`)
    
    if (stats.null_roles === '0') {
      console.log('🎉 Emergency Role enum fix completed successfully!')
    } else {
      console.log('⚠️ Some null roles remain - may need additional investigation')
    }
    
  } catch (error) {
    console.error('❌ Emergency enum fix failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Emergency enum fix script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Emergency enum fix script failed:', error)
      process.exit(1)
    })
}