const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllClients() {
  try {
    // Get all clients (including soft-deleted)
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        deletedAt: true,
        _count: {
          select: {
            projects: true,
            rfis: true,
            contacts: true,
          }
        }
      }
    });

    console.log(`Total clients in database: ${allClients.length}\n`);

    if (allClients.length === 0) {
      console.log('No clients found in database.');
      return;
    }

    // Separate active and deleted
    const activeClients = allClients.filter(c => !c.deletedAt);
    const deletedClients = allClients.filter(c => c.deletedAt);

    console.log('ACTIVE CLIENTS:');
    console.log('=' .repeat(80));
    if (activeClients.length === 0) {
      console.log('No active clients');
    } else {
      activeClients.forEach(c => {
        console.log(`Name: ${c.name}`);
        console.log(`Email: ${c.email}`);
        console.log(`ID: ${c.id}`);
        console.log(`Active: ${c.active}`);
        console.log(`Dependencies: ${c._count.projects} projects, ${c._count.rfis} RFIs, ${c._count.contacts} contacts`);
        console.log('-'.repeat(40));
      });
    }

    console.log('\nSOFT-DELETED CLIENTS:');
    console.log('='.repeat(80));
    if (deletedClients.length === 0) {
      console.log('No soft-deleted clients');
    } else {
      deletedClients.forEach(c => {
        console.log(`Name: ${c.name}`);
        console.log(`Email: ${c.email}`);
        console.log(`ID: ${c.id}`);
        console.log(`Deleted At: ${c.deletedAt}`);
        console.log(`Dependencies: ${c._count.projects} projects, ${c._count.rfis} RFIs, ${c._count.contacts} contacts`);
        console.log('-'.repeat(40));
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllClients();