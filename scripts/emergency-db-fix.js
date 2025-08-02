#!/usr/bin/env node

/**
 * Emergency Database Fix Script
 * Removes failed migration records and applies pending migrations
 */

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Starting emergency database fix...')
    
    // Step 1: Check for failed migrations
    console.log('📋 Checking for failed migrations...')
    const failedMigrations = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NULL
    `
    
    if (failedMigrations.length > 0) {
      console.log('❌ Found failed migrations:')
      failedMigrations.forEach(m => {
        console.log(`   - ${m.migration_name} (started: ${m.started_at})`)
      })
      
      // Step 2: Remove the specific failed migration record
      console.log('🗑️ Removing failed migration records...')
      const result = await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20250801000000_add_missing_stakeholder_features'
      `
      console.log(`✅ Removed ${result} failed migration record(s)`)
    } else {
      console.log('✅ No failed migrations found')
    }
    
    // Step 3: Check for missing columns and add them safely
    console.log('🔍 Checking for missing database columns...')
    
    // Check contacts table columns
    const contactsColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND table_schema = 'public'
    `
    
    const contactColumnNames = contactsColumns.map(col => col.column_name)
    const requiredContactColumns = ['password', 'role', 'lastLogin', 'emailVerified', 'registrationEligible']
    
    for (const columnName of requiredContactColumns) {
      if (!contactColumnNames.includes(columnName)) {
        console.log(`➕ Adding missing column: contacts.${columnName}`)
        try {
          switch (columnName) {
            case 'password':
              await prisma.$executeRaw`ALTER TABLE "contacts" ADD COLUMN "password" TEXT`
              break
            case 'role':
              await prisma.$executeRaw`ALTER TABLE "contacts" ADD COLUMN "role" "Role" DEFAULT 'STAKEHOLDER_L1'`
              break
            case 'lastLogin':
              await prisma.$executeRaw`ALTER TABLE "contacts" ADD COLUMN "lastLogin" TIMESTAMP(3)`
              break
            case 'emailVerified':
              await prisma.$executeRaw`ALTER TABLE "contacts" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false`
              break
            case 'registrationEligible':
              await prisma.$executeRaw`ALTER TABLE "contacts" ADD COLUMN "registrationEligible" BOOLEAN DEFAULT false`
              break
          }
          console.log(`✅ Added column: contacts.${columnName}`)
        } catch (error) {
          console.log(`⚠️ Column contacts.${columnName} may already exist or error: ${error.message}`)
        }
      } else {
        console.log(`✅ Column exists: contacts.${columnName}`)
      }
    }
    
    // Check project_stakeholders table columns  
    const stakeholderColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_stakeholders' AND table_schema = 'public'
    `
    
    const stakeholderColumnNames = stakeholderColumns.map(col => col.column_name)
    const requiredStakeholderColumns = ['addedById', 'addedByContactId', 'stakeholderLevel', 'autoApproved']
    
    for (const columnName of requiredStakeholderColumns) {
      if (!stakeholderColumnNames.includes(columnName)) {
        console.log(`➕ Adding missing column: project_stakeholders.${columnName}`)
        try {
          switch (columnName) {
            case 'addedById':
              await prisma.$executeRaw`ALTER TABLE "project_stakeholders" ADD COLUMN "addedById" TEXT`
              break
            case 'addedByContactId':
              await prisma.$executeRaw`ALTER TABLE "project_stakeholders" ADD COLUMN "addedByContactId" TEXT`
              break
            case 'stakeholderLevel':
              await prisma.$executeRaw`ALTER TABLE "project_stakeholders" ADD COLUMN "stakeholderLevel" INTEGER DEFAULT 1`
              break
            case 'autoApproved':
              await prisma.$executeRaw`ALTER TABLE "project_stakeholders" ADD COLUMN "autoApproved" BOOLEAN DEFAULT true`
              break
          }
          console.log(`✅ Added column: project_stakeholders.${columnName}`)
        } catch (error) {
          console.log(`⚠️ Column project_stakeholders.${columnName} may already exist or error: ${error.message}`)
        }
      } else {
        console.log(`✅ Column exists: project_stakeholders.${columnName}`)
      }
    }
    
    // Step 4: Check for missing tables
    console.log('🏗️ Checking for missing tables...')
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    
    const tableNames = tables.map(t => t.table_name)
    
    // Create access_requests table if missing
    if (!tableNames.includes('access_requests')) {
      console.log('➕ Creating access_requests table...')
      try {
        await prisma.$executeRaw`
          CREATE TABLE "access_requests" (
            "id" TEXT NOT NULL,
            "contactId" TEXT NOT NULL,
            "projectId" TEXT NOT NULL,
            "requestedRole" TEXT NOT NULL,
            "justification" TEXT,
            "autoApprovalReason" TEXT,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "processedAt" TIMESTAMP(3),
            "processedById" TEXT,
            CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
          )
        `
        console.log('✅ Created access_requests table')
      } catch (error) {
        console.log(`⚠️ access_requests table may already exist: ${error.message}`)
      }
    } else {
      console.log('✅ Table exists: access_requests')
    }
    
    // Create registration_tokens table if missing
    if (!tableNames.includes('registration_tokens')) {
      console.log('➕ Creating registration_tokens table...')
      try {
        await prisma.$executeRaw`
          CREATE TABLE "registration_tokens" (
            "id" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "contactId" TEXT NOT NULL,
            "projectIds" TEXT[],
            "tokenType" TEXT NOT NULL DEFAULT 'AUTO_APPROVED',
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "usedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "registration_tokens_pkey" PRIMARY KEY ("id")
          )
        `
        console.log('✅ Created registration_tokens table')
      } catch (error) {
        console.log(`⚠️ registration_tokens table may already exist: ${error.message}`)
      }
    } else {
      console.log('✅ Table exists: registration_tokens')
    }
    
    // Step 5: Fix any null Role values in contacts
    console.log('🔧 Checking for null Role values in contacts...')
    const nullRoleCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE role IS NULL
    `
    
    if (nullRoleCount[0].count > 0) {
      console.log(`❌ Found ${nullRoleCount[0].count} contacts with null roles`)
      console.log('🔧 Updating null roles to STAKEHOLDER_L1...')
      
      const updateResult = await prisma.$executeRaw`
        UPDATE contacts 
        SET role = 'STAKEHOLDER_L1'::text::"Role"
        WHERE role IS NULL
      `
      
      console.log(`✅ Updated ${updateResult} contacts to have STAKEHOLDER_L1 role`)
    } else {
      console.log('✅ All contacts have valid Role values')
    }
    
    console.log('🎉 Emergency database fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}