#!/usr/bin/env node

/**
 * Emergency migration script to add authorContactId support to responses table
 * This allows stakeholders to create responses to RFIs
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Starting response table migration...')
    
    console.log('📝 Applying SQL migration commands individually...')
    
    // Execute SQL commands individually to avoid prepared statement issues
    
    // 1. Add the authorContactId column (nullable)
    console.log('  - Adding authorContactId column...')
    await prisma.$executeRaw`ALTER TABLE responses ADD COLUMN IF NOT EXISTS "authorContactId" TEXT`
    
    // 2. Make authorId nullable
    console.log('  - Making authorId nullable...')
    await prisma.$executeRaw`ALTER TABLE responses ALTER COLUMN "authorId" DROP NOT NULL`
    
    // 3. Add index for the new column
    console.log('  - Adding index for authorContactId...')
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "responses_authorContactId_idx" ON responses("authorContactId")`
    
    // 4. Add foreign key constraint (using a different approach)
    console.log('  - Adding foreign key constraint...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE responses 
        ADD CONSTRAINT "responses_authorContactId_fkey" 
        FOREIGN KEY ("authorContactId") REFERENCES contacts(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  - Foreign key constraint already exists, skipping...')
      } else {
        throw error
      }
    }
    
    console.log('✅ Migration applied successfully!')
    
    // Verify the column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'responses' 
      AND column_name = 'authorContactId'
    `
    
    if (result.length > 0) {
      console.log('✅ authorContactId column verified in responses table')
    } else {
      console.log('❌ authorContactId column not found - migration may have failed')
      process.exit(1)
    }
    
    // Check existing responses
    const responseCount = await prisma.response.count()
    console.log(`📊 Total responses in database: ${responseCount}`)
    
    const responsesWithUsers = await prisma.response.count({
      where: { authorId: { not: null } }
    })
    console.log(`👤 Responses with user authors: ${responsesWithUsers}`)
    
    const responsesWithContacts = await prisma.response.count({
      where: { authorContactId: { not: null } }
    })    
    console.log(`🤝 Responses with contact authors: ${responsesWithContacts}`)
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})