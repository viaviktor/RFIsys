#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Debugging null Role enum errors...')
    
    // Check contacts table directly
    console.log('\n1. Checking contacts table for null roles:')
    const contactsWithNullRole = await prisma.$queryRaw`
      SELECT id, name, email, role 
      FROM contacts 
      WHERE role IS NULL
    `
    console.log(`Found ${contactsWithNullRole.length} contacts with null roles:`)
    contactsWithNullRole.forEach(c => {
      console.log(`  - ${c.name} (${c.email}): role = ${c.role}`)
    })
    
    // Use Prisma client instead of raw SQL for type safety
    console.log('\n2. Using Prisma API to check stakeholders with null contact roles:')
    try {
      const allStakeholders = await prisma.projectStakeholder.findMany({
        include: {
          contact: true
        }
      })
      
      const stakeholdersWithNullRoles = allStakeholders.filter(s => 
        s.contact && s.contact.role === null
      )
      
      console.log(`Found ${stakeholdersWithNullRoles.length} stakeholder relationships with null contact roles:`)
      stakeholdersWithNullRoles.forEach(s => {
        console.log(`  - ${s.contact.name} (${s.contact.email}): role = ${s.contact.role}`)
      })
    } catch (error) {
      console.log('❌ Failed to check stakeholders via Prisma API:', error.message)
    }
    
    // Check exact query that's failing (from the error logs)
    console.log('\n4. Testing exact failing queries:')
    
    try {
      console.log('Testing contact.findMany()...')
      const contacts = await prisma.contact.findMany({
        take: 1
      })
      console.log('✅ contact.findMany() works')
    } catch (error) {
      console.log('❌ contact.findMany() fails:', error.message)
    }
    
    try {
      console.log('Testing projectStakeholder.findMany()...')
      const stakeholders = await prisma.projectStakeholder.findMany({
        take: 1,
        include: {
          contact: true
        }
      })
      console.log('✅ projectStakeholder.findMany() with include works')
    } catch (error) {
      console.log('❌ projectStakeholder.findMany() with include fails:', error.message)
    }
    
    // Test specific project stakeholders query
    try {
      console.log('Testing specific project stakeholders query...')
      const projectStakeholders = await prisma.projectStakeholder.findMany({
        where: {
          projectId: 'cmdqugehu000cxz48qy0ondui' // From the error logs
        },
        include: {
          contact: true
        }
      })
      console.log('✅ Specific project stakeholders query works')
    } catch (error) {
      console.log('❌ Specific project stakeholders query fails:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()