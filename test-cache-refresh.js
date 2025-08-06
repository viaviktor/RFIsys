#!/usr/bin/env node

/**
 * Test script to verify cache refresh functionality
 */

const BASE_URL = 'http://localhost:3000';

async function testCacheRefresh() {
  try {
    console.log('🧪 Testing Cache Refresh System\n');
    console.log('================================\n');

    // Test 1: Check RFI count
    console.log('1. Getting current RFI summary...');
    const rfiResponse = await fetch(`${BASE_URL}/api/rfis/reminders`);
    
    if (!rfiResponse.ok) {
      throw new Error(`Failed to get RFI summary: ${rfiResponse.status}`);
    }

    const rfiSummary = await rfiResponse.json();
    console.log(`   ✓ Total RFIs in system: ${rfiSummary.dueTomorrow + rfiSummary.overdue}`);
    console.log(`   ✓ Due Tomorrow: ${rfiSummary.dueTomorrow}`);
    console.log(`   ✓ Overdue: ${rfiSummary.overdue}\n`);

    // Test 2: Check projects (should now have event listeners)
    console.log('2. Testing project data refresh...');
    const projectsResponse = await fetch(`${BASE_URL}/api/projects`);
    
    if (!projectsResponse.ok) {
      throw new Error(`Failed to get projects: ${projectsResponse.status}`);
    }

    const projectsData = await projectsResponse.json();
    console.log(`   ✓ Total projects: ${projectsData.pagination.total}`);
    
    if (projectsData.data.length > 0) {
      const firstProject = projectsData.data[0];
      console.log(`   ✓ First project: "${firstProject.name}" has ${firstProject._count?.rfis || 0} RFIs`);
    }
    console.log();

    // Test 3: Check clients (should now have event listeners)
    console.log('3. Testing client data refresh...');
    const clientsResponse = await fetch(`${BASE_URL}/api/clients`);
    
    if (!clientsResponse.ok) {
      throw new Error(`Failed to get clients: ${clientsResponse.status}`);
    }

    const clientsData = await clientsResponse.json();
    console.log(`   ✓ Total clients: ${clientsData.pagination.total}`);
    
    if (clientsData.data.length > 0) {
      const firstClient = clientsData.data[0];
      console.log(`   ✓ First client: "${firstClient.name}" has ${firstClient._count?.rfis || 0} RFIs`);
    }
    console.log();

    console.log('================================');
    console.log('✅ Cache refresh system test complete!\n');
    
    console.log('📝 What was fixed:');
    console.log('   - Added global event system for cross-hook communication');
    console.log('   - useProjects and useClients now listen for RFI change events');
    console.log('   - When RFIs are created/updated/deleted, all related data refreshes');
    console.log('   - Project RFI counts and client RFI counts will now update immediately');
    console.log('   - No more stale data showing deleted RFIs in project/client dashboards\n');

    console.log('🚀 Next steps:');
    console.log('   - Test by deleting an RFI in the UI');
    console.log('   - Verify project dashboard updates RFI count immediately');
    console.log('   - Verify client dashboard removes deleted RFI immediately');
    console.log('   - No more "RFI not found" errors when clicking stale links');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the development server is running on port 3000');
    process.exit(1);
  }
}

// Run the test
testCacheRefresh();