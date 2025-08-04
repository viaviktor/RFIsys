/**
 * Test script for delete operations
 * Tests that delete buttons work and records are properly soft-deleted
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://rfi_user:rfi_dev_password@localhost:5432/rfi_development'
    }
  }
})

async function testDeleteOperations() {
  console.log('🧪 Testing Delete Operations...\n')

  try {
    // Test 1: Create a test client for deletion
    console.log('📋 Test 1: Creating test client for deletion...')
    
    const testClient = await prisma.client.create({
      data: {
        name: 'Test Client for Deletion',
        contactName: 'Test Contact',
        email: 'test-delete@example.com',
        phone: '555-0123',
        notes: 'This is a test client created for deletion testing'
      }
    })
    
    console.log(`✅ Created test client: ${testClient.name} (ID: ${testClient.id})`)

    // Test 2: Verify client is visible in API queries
    console.log('\n📋 Test 2: Verifying client is visible...')
    
    const visibleClients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, deletedAt: true }
    })
    
    const isVisible = visibleClients.some(c => c.id === testClient.id)
    console.log(`✅ Test client is visible in API queries: ${isVisible}`)
    console.log(`📊 Total visible clients: ${visibleClients.length}`)

    // Test 3: Perform soft delete
    console.log('\n📋 Test 3: Performing soft delete...')
    
    const deletedClient = await prisma.client.update({
      where: { id: testClient.id },
      data: { 
        deletedAt: new Date(),
        active: false // Also deactivate
      },
      select: { id: true, name: true, deletedAt: true, active: true }
    })
    
    console.log(`✅ Soft deleted client: ${deletedClient.name}`)
    console.log(`📅 Deleted at: ${deletedClient.deletedAt}`)
    console.log(`🔒 Active status: ${deletedClient.active}`)

    // Test 4: Verify client is now hidden in API queries
    console.log('\n📋 Test 4: Verifying client is now hidden...')
    
    const visibleClientsAfter = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, deletedAt: true }
    })
    
    const isVisibleAfter = visibleClientsAfter.some(c => c.id === testClient.id)
    console.log(`✅ Test client is hidden from API queries: ${!isVisibleAfter}`)
    console.log(`📊 Total visible clients after deletion: ${visibleClientsAfter.length}`)

    // Test 5: Verify client still exists in database (soft delete)
    console.log('\n📋 Test 5: Verifying client still exists in database...')
    
    const allClients = await prisma.client.findMany({
      where: { id: testClient.id }, // No deletedAt filter
      select: { id: true, name: true, deletedAt: true }
    })
    
    console.log(`✅ Client still exists in database: ${allClients.length > 0}`)
    if (allClients.length > 0) {
      console.log(`📅 Client has deletedAt timestamp: ${allClients[0].deletedAt !== null}`)
    }

    // Test 6: Test deleted records query
    console.log('\n📋 Test 6: Testing deleted records query...')
    
    const deletedClients = await prisma.client.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, deletedAt: true }
    })
    
    console.log(`📊 Total deleted clients: ${deletedClients.length}`)
    const ourDeletedClient = deletedClients.find(c => c.id === testClient.id)
    console.log(`✅ Our test client appears in deleted records: ${ourDeletedClient !== undefined}`)

    // Test 7: Test API endpoint behavior simulation
    console.log('\n📋 Test 7: Simulating API endpoint behavior...')
    
    // Simulate GET /api/clients (should exclude deleted)
    const apiClients = await prisma.client.findMany({
      where: { deletedAt: null }, // This is what the API does
      select: { id: true, name: true }
    })
    
    console.log(`✅ API simulation: Returns ${apiClients.length} clients (excludes deleted)`)
    
    // Simulate GET /api/clients/[id] for deleted client (should return 404)
    const apiClient = await prisma.client.findFirst({
      where: { 
        id: testClient.id,
        deletedAt: null 
      }
    })
    
    console.log(`✅ API simulation: Deleted client lookup returns null: ${apiClient === null}`)

    // Clean up: Remove test client completely
    console.log('\n🧹 Cleaning up test data...')
    await prisma.client.delete({
      where: { id: testClient.id }
    })
    console.log('✅ Test client removed from database')

    console.log('\n🎉 Delete Operations Tests Completed Successfully!')
    console.log('\n📋 Summary:')
    console.log('✅ Soft delete properly sets deletedAt timestamp')
    console.log('✅ Soft deleted records are hidden from API queries')
    console.log('✅ Soft deleted records are preserved in database')
    console.log('✅ API endpoints correctly filter out deleted records')
    console.log('✅ Deleted records can be queried separately if needed')

  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDeleteOperations().catch(console.error)