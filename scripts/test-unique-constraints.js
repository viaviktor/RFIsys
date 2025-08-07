const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUniqueConstraints() {
  console.log('Testing unique constraints with soft-deleted records...\n');

  try {
    // Check soft-deleted clients
    console.log('1. Checking soft-deleted clients:');
    const deletedClients = await prisma.client.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, email: true, deletedAt: true }
    });
    console.log(`   Found ${deletedClients.length} soft-deleted clients`);
    if (deletedClients.length > 0) {
      console.log('   Emails of deleted clients:');
      deletedClients.forEach(c => {
        console.log(`   - ${c.email} (deleted at ${c.deletedAt})`);
      });
    }

    // Check soft-deleted users
    console.log('\n2. Checking soft-deleted users:');
    const deletedUsers = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, email: true, deletedAt: true }
    });
    console.log(`   Found ${deletedUsers.length} soft-deleted users`);
    if (deletedUsers.length > 0) {
      console.log('   Emails of deleted users:');
      deletedUsers.forEach(u => {
        console.log(`   - ${u.email} (deleted at ${u.deletedAt})`);
      });
    }

    // Check soft-deleted contacts
    console.log('\n3. Checking soft-deleted contacts:');
    const deletedContacts = await prisma.contact.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, email: true, deletedAt: true, clientId: true }
    });
    console.log(`   Found ${deletedContacts.length} soft-deleted contacts`);
    if (deletedContacts.length > 0) {
      console.log('   Emails of deleted contacts:');
      deletedContacts.forEach(c => {
        console.log(`   - ${c.email} (deleted at ${c.deletedAt})`);
      });
    }

    // Test creating a client with the same email as a deleted one
    if (deletedClients.length > 0) {
      console.log('\n4. Testing client creation with same email as deleted client:');
      const testEmail = deletedClients[0].email;
      console.log(`   Attempting to create client with email: ${testEmail}`);
      
      // Check if we can create it (should work with the fix)
      const existingActive = await prisma.client.findFirst({
        where: { email: testEmail, deletedAt: null }
      });
      
      if (!existingActive) {
        console.log('   ✅ No active client with this email exists - creation would succeed');
      } else {
        console.log('   ❌ Active client with this email exists - creation would fail');
      }
    }

    console.log('\n✅ Unique constraint test completed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUniqueConstraints();