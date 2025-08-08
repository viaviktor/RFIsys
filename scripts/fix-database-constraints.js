const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeUniqueConstraints() {
  console.log('🔍 Checking and removing unique constraints incompatible with soft-delete...\n');

  try {
    // Check existing unique constraints
    console.log('1. Checking existing unique constraints...');
    
    const projectConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'projects'
      ) AND contype = 'u'
    `;
    
    const userConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'users'
      ) AND contype = 'u'
    `;
    
    const rfiConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'rfis'
      ) AND contype = 'u'
    `;

    console.log('Projects table unique constraints:', projectConstraints);
    console.log('Users table unique constraints:', userConstraints);
    console.log('RFIs table unique constraints:', rfiConstraints);

    // Remove project number constraint
    console.log('\n2. Removing projectNumber unique constraint...');
    try {
      await prisma.$executeRaw`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_projectNumber_key`;
      console.log('✅ Removed projects_projectNumber_key');
    } catch (error) {
      console.log('ℹ️  projects_projectNumber_key already removed or doesn\'t exist');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE projects DROP CONSTRAINT IF EXISTS "projects_projectNumber_key"`;
      console.log('✅ Removed "projects_projectNumber_key"');
    } catch (error) {
      console.log('ℹ️  "projects_projectNumber_key" already removed or doesn\'t exist');
    }

    // Remove user email constraint  
    console.log('\n3. Removing user email unique constraint...');
    try {
      await prisma.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`;
      console.log('✅ Removed users_email_key');
    } catch (error) {
      console.log('ℹ️  users_email_key already removed or doesn\'t exist');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_email_key"`;
      console.log('✅ Removed "users_email_key"');
    } catch (error) {
      console.log('ℹ️  "users_email_key" already removed or doesn\'t exist');
    }

    // Remove RFI number constraint
    console.log('\n4. Removing rfiNumber unique constraint...');
    try {
      await prisma.$executeRaw`ALTER TABLE rfis DROP CONSTRAINT IF EXISTS rfis_rfiNumber_key`;
      console.log('✅ Removed rfis_rfiNumber_key');
    } catch (error) {
      console.log('ℹ️  rfis_rfiNumber_key already removed or doesn\'t exist');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE rfis DROP CONSTRAINT IF EXISTS "rfis_rfiNumber_key"`;
      console.log('✅ Removed "rfis_rfiNumber_key"');
    } catch (error) {
      console.log('ℹ️  "rfis_rfiNumber_key" already removed or doesn\'t exist');
    }

    // Verify constraints were removed
    console.log('\n5. Verifying constraints were removed...');
    
    const finalProjectConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'projects'
      ) AND contype = 'u'
    `;
    
    const finalUserConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'users'
      ) AND contype = 'u'
    `;
    
    const finalRfiConstraints = await prisma.$queryRaw`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = 'rfis'
      ) AND contype = 'u'
    `;

    console.log('\n📊 FINAL STATE:');
    console.log('Projects unique constraints remaining:', finalProjectConstraints.length);
    if (finalProjectConstraints.length > 0) {
      finalProjectConstraints.forEach(c => console.log(`  - ${c.constraint_name}: ${c.constraint_definition}`));
    }
    
    console.log('Users unique constraints remaining:', finalUserConstraints.length);
    if (finalUserConstraints.length > 0) {
      finalUserConstraints.forEach(c => console.log(`  - ${c.constraint_name}: ${c.constraint_definition}`));
    }
    
    console.log('RFIs unique constraints remaining:', finalRfiConstraints.length);
    if (finalRfiConstraints.length > 0) {
      finalRfiConstraints.forEach(c => console.log(`  - ${c.constraint_name}: ${c.constraint_definition}`));
    }

    console.log('\n✅ Database constraint removal completed!');
    console.log('🎯 You can now create projects, users, and RFIs with values from soft-deleted records.');

  } catch (error) {
    console.error('❌ Error removing constraints:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeUniqueConstraints();