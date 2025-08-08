const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Use Cloudron database URL if available
const DATABASE_URL = process.env.CLOUDRON_POSTGRESQL_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No database URL found');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

(async () => {
  try {
    console.log('🔧 Applying password reset fields migration');
    console.log(`📡 Database: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}\n`);
    
    // Read and execute the SQL migration
    const sqlPath = path.join(__dirname, 'scripts', 'add-reset-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    const result = await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration applied successfully!');
    console.log('Result:', result);
    
    // Update admin email while we're here
    console.log('\n🔄 Updating admin email...');
    const admin = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN',
        deletedAt: null,
        active: true
      }
    });
    
    if (admin) {
      if (admin.email !== 'victork@steel-detailer.com') {
        await prisma.user.update({
          where: { id: admin.id },
          data: { email: 'victork@steel-detailer.com' }
        });
        console.log('✅ Admin email updated to: victork@steel-detailer.com');
      } else {
        console.log('✅ Admin email already correct: victork@steel-detailer.com');
      }
    } else {
      console.log('⚠️  No admin user found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();