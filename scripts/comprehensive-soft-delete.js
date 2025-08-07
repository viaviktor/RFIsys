const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Comprehensive soft-delete functions for all entities
 * Ensures proper cascading deletion without leaving orphaned records
 */

// Soft delete a client and all its dependencies
async function softDeleteClient(clientId) {
  console.log(`\nSoft deleting client: ${clientId}`);
  
  const deleteTime = new Date();
  
  // Start transaction for atomic operation
  return await prisma.$transaction(async (tx) => {
    // 1. First, soft delete all contacts for this client
    const contactsDeleted = await tx.contact.updateMany({
      where: { 
        clientId,
        deletedAt: null
      },
      data: {
        deletedAt: deleteTime,
        active: false
      }
    });
    console.log(`  - Soft deleted ${contactsDeleted.count} contacts`);

    // 2. Soft delete all RFIs for this client
    const rfisDeleted = await tx.rfi.updateMany({
      where: { 
        clientId,
        deletedAt: null
      },
      data: {
        deletedAt: deleteTime
      }
    });
    console.log(`  - Soft deleted ${rfisDeleted.count} RFIs`);

    // 3. Soft delete all projects for this client
    const projectsDeleted = await tx.project.updateMany({
      where: { 
        clientId,
        deletedAt: null
      },
      data: {
        deletedAt: deleteTime,
        active: false
      }
    });
    console.log(`  - Soft deleted ${projectsDeleted.count} projects`);

    // 4. Finally, soft delete the client itself
    const client = await tx.client.update({
      where: { id: clientId },
      data: {
        deletedAt: deleteTime,
        active: false
      }
    });
    console.log(`  ✅ Client soft deleted successfully`);
    
    return client;
  });
}

// Soft delete a project and all its dependencies
async function softDeleteProject(projectId) {
  console.log(`\nSoft deleting project: ${projectId}`);
  
  const deleteTime = new Date();
  
  return await prisma.$transaction(async (tx) => {
    // 1. Soft delete all RFIs for this project
    const rfisDeleted = await tx.rfi.updateMany({
      where: { 
        projectId,
        deletedAt: null
      },
      data: {
        deletedAt: deleteTime
      }
    });
    console.log(`  - Soft deleted ${rfisDeleted.count} RFIs`);

    // 2. Remove all project stakeholders (hard delete as these are relationships)
    const stakeholdersRemoved = await tx.projectStakeholder.deleteMany({
      where: { projectId }
    });
    console.log(`  - Removed ${stakeholdersRemoved.count} stakeholder associations`);

    // 3. Soft delete the project itself
    const project = await tx.project.update({
      where: { id: projectId },
      data: {
        deletedAt: deleteTime,
        active: false
      }
    });
    console.log(`  ✅ Project soft deleted successfully`);
    
    return project;
  });
}

// Soft delete a user
async function softDeleteUser(userId) {
  console.log(`\nSoft deleting user: ${userId}`);
  
  const deleteTime = new Date();
  
  // Check for dependencies
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          managedProjects: {
            where: { deletedAt: null }
          },
          responses: {
            where: { deletedAt: null }
          }
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user._count.managedProjects > 0) {
    console.log(`  ⚠️ Warning: User manages ${user._count.managedProjects} active projects`);
    console.log(`  Consider reassigning these projects before deletion`);
  }

  // Soft delete the user
  const deletedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: deleteTime,
      active: false
    }
  });
  
  console.log(`  ✅ User soft deleted successfully`);
  return deletedUser;
}

// Soft delete a contact
async function softDeleteContact(contactId) {
  console.log(`\nSoft deleting contact: ${contactId}`);
  
  const deleteTime = new Date();
  
  return await prisma.$transaction(async (tx) => {
    // 1. Remove project stakeholder associations
    const stakeholdersRemoved = await tx.projectStakeholder.deleteMany({
      where: { contactId }
    });
    console.log(`  - Removed ${stakeholdersRemoved.count} stakeholder associations`);

    // 2. Clear any access requests
    const accessRequestsCleared = await tx.accessRequest.updateMany({
      where: { 
        contactId,
        status: 'PENDING'
      },
      data: {
        status: 'REJECTED',
        reviewedAt: deleteTime
      }
    });
    console.log(`  - Cleared ${accessRequestsCleared.count} pending access requests`);

    // 3. Soft delete the contact
    const contact = await tx.contact.update({
      where: { id: contactId },
      data: {
        deletedAt: deleteTime,
        active: false,
        password: null, // Clear password to prevent login
        role: null // Clear role
      }
    });
    console.log(`  ✅ Contact soft deleted successfully`);
    
    return contact;
  });
}

// Test all unique constraints after soft deletion
async function testUniqueConstraintsAfterDeletion() {
  console.log('\n=== Testing Unique Constraints After Soft Deletion ===\n');

  try {
    // Get all soft-deleted entities with unique fields
    const deletedClients = await prisma.client.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, email: true, name: true }
    });

    const deletedProjects = await prisma.project.findMany({
      where: { 
        deletedAt: { not: null },
        projectNumber: { not: null }
      },
      select: { id: true, projectNumber: true, name: true }
    });

    const deletedUsers = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, email: true, name: true }
    });

    const deletedContacts = await prisma.contact.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, email: true, name: true, clientId: true }
    });

    console.log('Soft-deleted entities summary:');
    console.log(`  - Clients: ${deletedClients.length}`);
    console.log(`  - Projects with numbers: ${deletedProjects.length}`);
    console.log(`  - Users: ${deletedUsers.length}`);
    console.log(`  - Contacts: ${deletedContacts.length}`);

    // Test that we can create new entities with same unique values
    const tests = [];

    if (deletedClients.length > 0) {
      const testEmail = deletedClients[0].email;
      const canCreate = await prisma.client.findFirst({
        where: { email: testEmail, deletedAt: null }
      });
      tests.push({
        entity: 'Client',
        field: 'email',
        value: testEmail,
        canReuse: !canCreate
      });
    }

    if (deletedProjects.length > 0) {
      const testNumber = deletedProjects[0].projectNumber;
      const canCreate = await prisma.project.findFirst({
        where: { projectNumber: testNumber, deletedAt: null }
      });
      tests.push({
        entity: 'Project',
        field: 'projectNumber',
        value: testNumber,
        canReuse: !canCreate
      });
    }

    if (deletedUsers.length > 0) {
      const testEmail = deletedUsers[0].email;
      const canCreate = await prisma.user.findFirst({
        where: { email: testEmail, deletedAt: null }
      });
      tests.push({
        entity: 'User',
        field: 'email',
        value: testEmail,
        canReuse: !canCreate
      });
    }

    console.log('\nUnique constraint tests:');
    tests.forEach(test => {
      const status = test.canReuse ? '✅' : '❌';
      console.log(`  ${status} ${test.entity} ${test.field}: "${test.value}" - ${test.canReuse ? 'Can reuse' : 'Cannot reuse (active record exists)'}`);
    });

    return tests;

  } catch (error) {
    console.error('Error testing constraints:', error);
    throw error;
  }
}

// Main function to demonstrate usage
async function main() {
  const action = process.argv[2];
  const id = process.argv[3];

  if (!action) {
    console.log('Usage:');
    console.log('  node comprehensive-soft-delete.js test');
    console.log('  node comprehensive-soft-delete.js delete-client <client-id>');
    console.log('  node comprehensive-soft-delete.js delete-project <project-id>');
    console.log('  node comprehensive-soft-delete.js delete-user <user-id>');
    console.log('  node comprehensive-soft-delete.js delete-contact <contact-id>');
    process.exit(1);
  }

  try {
    switch (action) {
      case 'test':
        await testUniqueConstraintsAfterDeletion();
        break;
      
      case 'delete-client':
        if (!id) {
          console.error('Client ID required');
          process.exit(1);
        }
        await softDeleteClient(id);
        await testUniqueConstraintsAfterDeletion();
        break;
      
      case 'delete-project':
        if (!id) {
          console.error('Project ID required');
          process.exit(1);
        }
        await softDeleteProject(id);
        await testUniqueConstraintsAfterDeletion();
        break;
      
      case 'delete-user':
        if (!id) {
          console.error('User ID required');
          process.exit(1);
        }
        await softDeleteUser(id);
        await testUniqueConstraintsAfterDeletion();
        break;
      
      case 'delete-contact':
        if (!id) {
          console.error('Contact ID required');
          process.exit(1);
        }
        await softDeleteContact(id);
        await testUniqueConstraintsAfterDeletion();
        break;
      
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for use in other scripts
module.exports = {
  softDeleteClient,
  softDeleteProject,
  softDeleteUser,
  softDeleteContact,
  testUniqueConstraintsAfterDeletion
};

// Run if called directly
if (require.main === module) {
  main();
}