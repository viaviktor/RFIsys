#!/usr/bin/env node

/**
 * Fix Role enum to include STAKEHOLDER_L1 and STAKEHOLDER_L2 values
 */

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Fixing Role enum values...')
    
    // Step 1: Check current enum values
    console.log('📋 Checking current Role enum values...')
    const currentValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'Role'
      )
      ORDER BY enumsortorder
    `
    
    console.log('Current enum values:', currentValues.map(v => v.enumlabel))
    
    // Step 2: Add missing enum values if needed
    const hasStakeholderL1 = currentValues.some(v => v.enumlabel === 'STAKEHOLDER_L1')
    const hasStakeholderL2 = currentValues.some(v => v.enumlabel === 'STAKEHOLDER_L2')
    
    if (!hasStakeholderL1 || !hasStakeholderL2) {
      console.log('❌ Missing STAKEHOLDER enum values, adding them...')
      
      // PostgreSQL requires special handling for enum type changes
      // We need to create a new enum type and migrate the data
      
      await prisma.$transaction(async (tx) => {
        // Create new enum type with all values
        await tx.$executeRaw`
          CREATE TYPE "Role_new" AS ENUM ('USER', 'MANAGER', 'ADMIN', 'STAKEHOLDER_L1', 'STAKEHOLDER_L2')
        `
        console.log('✅ Created new Role enum type with all values')
        
        // Update columns to use new enum type
        // First, convert to text temporarily
        await tx.$executeRaw`
          ALTER TABLE "users" 
          ALTER COLUMN "role" TYPE TEXT 
          USING "role"::TEXT
        `
        
        await tx.$executeRaw`
          ALTER TABLE "contacts" 
          ALTER COLUMN "role" TYPE TEXT 
          USING "role"::TEXT
        `
        
        // Drop old enum type
        await tx.$executeRaw`DROP TYPE "Role"`
        
        // Rename new enum type
        await tx.$executeRaw`ALTER TYPE "Role_new" RENAME TO "Role"`
        
        // Convert columns back to enum type
        await tx.$executeRaw`
          ALTER TABLE "users" 
          ALTER COLUMN "role" TYPE "Role" 
          USING "role"::"Role"
        `
        
        await tx.$executeRaw`
          ALTER TABLE "contacts" 
          ALTER COLUMN "role" TYPE "Role" 
          USING "role"::"Role"
        `
        
        console.log('✅ Successfully migrated to new Role enum type')
      })
    } else {
      console.log('✅ Role enum already has STAKEHOLDER values')
    }
    
    // Step 3: Now fix null roles
    console.log('🔧 Fixing null Role values in contacts...')
    const updateResult = await prisma.$executeRaw`
      UPDATE contacts 
      SET role = 'STAKEHOLDER_L1'::"Role"
      WHERE role IS NULL
    `
    
    console.log(`✅ Updated ${updateResult} contacts to have STAKEHOLDER_L1 role`)
    
    // Verify
    const nullCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE role IS NULL
    `
    
    console.log(`📊 Contacts with null roles remaining: ${nullCount[0].count}`)
    
    console.log('🎉 Role enum fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing Role enum:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}