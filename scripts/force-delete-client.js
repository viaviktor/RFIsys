const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceDeleteClient(clientEmail) {
  console.log(`Force deleting client with email: ${clientEmail}\n`);

  try {
    // Find the client
    const client = await prisma.client.findFirst({
      where: { email: clientEmail },
      include: {
        _count: {
          select: {
            projects: true,
            rfis: true,
            contacts: true,
          }
        }
      }
    });

    if (!client) {
      console.log('Client not found');
      return;
    }

    console.log(`Found client: ${client.name}`);
    console.log(`Dependencies: ${client._count.projects} projects, ${client._count.rfis} RFIs, ${client._count.contacts} contacts`);
    console.log(`Deleted at: ${client.deletedAt}`);

    // Soft delete all related entities first
    console.log('\nSoft deleting related entities...');

    // Soft delete contacts
    if (client._count.contacts > 0) {
      const contactResult = await prisma.contact.updateMany({
        where: { 
          clientId: client.id,
          deletedAt: null
        },
        data: {
          deletedAt: new Date(),
          active: false
        }
      });
      console.log(`  - Soft deleted ${contactResult.count} contacts`);
    }

    // Soft delete RFIs
    if (client._count.rfis > 0) {
      const rfiResult = await prisma.rfi.updateMany({
        where: { 
          clientId: client.id,
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });
      console.log(`  - Soft deleted ${rfiResult.count} RFIs`);
    }

    // Soft delete projects
    if (client._count.projects > 0) {
      const projectResult = await prisma.project.updateMany({
        where: { 
          clientId: client.id,
          deletedAt: null
        },
        data: {
          deletedAt: new Date(),
          active: false
        }
      });
      console.log(`  - Soft deleted ${projectResult.count} projects`);
    }

    // Now soft delete the client
    const deletedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        deletedAt: new Date(),
        active: false
      }
    });

    console.log(`\n✅ Client "${deletedClient.name}" has been soft deleted`);
    console.log('You can now create a new client with the same email.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/force-delete-client.js <client-email>');
  process.exit(1);
}

forceDeleteClient(email);