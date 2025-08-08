import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // This is a one-time migration endpoint
    console.log('🔧 Running database migration for password reset fields')
    
    // Add the columns using raw SQL to avoid schema conflicts
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);
    `
    
    await prisma.$executeRaw`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);
    `
    
    // Add indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "users_resetToken_idx" ON users("resetToken");
    `
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "contacts_resetToken_idx" ON contacts("resetToken");
    `
    
    // Update admin email
    const admin = await prisma.$executeRaw`
      UPDATE users 
      SET email = 'victork@steel-detailer.com' 
      WHERE role = 'ADMIN' AND "deletedAt" IS NULL AND active = true 
        AND email != 'victork@steel-detailer.com'
    `
    
    console.log('✅ Database migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      operations: [
        'Added resetToken column to users',
        'Added resetExpires column to users', 
        'Added resetToken column to contacts',
        'Added resetExpires column to contacts',
        'Added indexes for performance',
        'Updated admin email'
      ]
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}