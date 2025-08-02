// Test script to verify emergency fix logic
const { PrismaClient } = require('@prisma/client');

async function testEmergencyFixLogic() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing emergency fix detection logic...');
    
    // Test the column check query
    const checkQuery = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_stakeholders' 
      AND column_name = 'addedBy'
    `;
    
    console.log('Found addedBy column:', checkQuery.length > 0);
    
    // Test table existence check
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'access_requests'
    `;
    
    console.log('Found access_requests table:', tableCheck.length > 0);
    
    // Test admin user query
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('Found admin user:', adminUser ? adminUser.id : 'None');
    
    console.log('✅ Emergency fix detection test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testEmergencyFixLogic()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));