import { PrismaClient, Role, RFIStatus, Priority, RFIDirection, RFIUrgency } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting enhanced seed...')

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'viktor@kravisindustrial.com',
      name: 'Viktor Kravchuk',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@kravisindustrial.com',
      name: 'Project Manager',
      password: hashedPassword,
      role: Role.MANAGER,
    },
  })

  const user = await prisma.user.create({
    data: {
      email: 'detailer@kravisindustrial.com',
      name: 'Steel Detailer',
      password: hashedPassword,
      role: Role.USER,
    },
  })

  console.log('Created users:', { admin: admin.id, manager: manager.id, user: user.id })

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Midwest Steel Fabricators',
        contactName: 'John Mitchell',
        email: 'john.mitchell@midweststeel.com',
        phone: '(555) 123-4567',
        address: '1234 Industrial Blvd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        notes: 'Long-term client, prefers detailed drawings',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Pacific Construction Group',
        contactName: 'Sarah Chen',
        email: 'sarah.chen@pacificconstruction.com',
        phone: '(555) 987-6543',
        address: '5678 Harbor View Drive',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        notes: 'Requires ASAP responses, high-volume projects',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Atlantic Engineering Corp',
        contactName: 'Mike Rodriguez',
        email: 'mike.rodriguez@atlanticengineering.com',
        phone: '(555) 456-7890',
        address: '9012 Tech Center Way',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30309',
        country: 'USA',
        notes: 'Technical client, detailed specifications required',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Construction Company',
        contactName: 'Client Company',
        email: 'viktor.business@gmail.com',
        phone: '(916) 698-7474',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
        notes: 'New client for testing contact system',
      },
    }),
  ])

  console.log(`Created ${clients.length} clients`)

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Downtown Office Complex Phase 1',
        description: 'Steel framing for 25-story office building',
        projectNumber: '316402',
        clientId: clients[0].id,
        managerId: manager.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
        notes: 'Complex geometry, requires detailed connection details',
      },
    }),
    prisma.project.create({
      data: {
        name: 'Warehouse Expansion Project',
        description: 'Steel structure for 50,000 sq ft warehouse expansion',
        projectNumber: '318745',
        clientId: clients[1].id,
        managerId: admin.id,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-15'),
        status: 'ACTIVE',
        notes: 'Fast-track project, aggressive schedule',
      },
    }),
    prisma.project.create({
      data: {
        name: 'Bridge Replacement - Highway 101',
        description: 'Steel girders and deck framing for highway bridge',
        projectNumber: '319856',
        clientId: clients[2].id,
        managerId: manager.id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-06-30'),
        status: 'ACTIVE',
        notes: 'DOT project, strict compliance requirements',
      },
    }),
    prisma.project.create({
      data: {
        name: 'Manufacturing Plant - Building B',
        description: 'Heavy industrial steel framing',
        projectNumber: '320157',
        clientId: clients[0].id,
        managerId: user.id,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-11-30'),
        status: 'ACTIVE',
        notes: 'Heavy crane loads, special connections required',
      },
    }),
  ])

  console.log(`Created ${projects.length} projects`)

  // Track RFI sequence per project
  const projectRFICounters: Record<string, number> = {}
  const generateProjectRFINumber = (projectNumber: string) => {
    if (!projectRFICounters[projectNumber]) {
      projectRFICounters[projectNumber] = 0
    }
    projectRFICounters[projectNumber]++
    return `${projectNumber}-${projectRFICounters[projectNumber]}`
  }

  // Create realistic RFIs
  const rfis = await Promise.all([
    prisma.rFI.create({
      data: {
        rfiNumber: generateProjectRFINumber('316402'),
        title: 'Connection Detail Clarification - Grid Line A',
        description: 'The connection detail shown on drawing S-102 for the beam-to-column connection at Grid Line A appears to conflict with the typical detail shown on S-001. The bolt spacing shown is 3" on S-102 but 4" on S-001. Please clarify which spacing should be used.',
        suggestedSolution: 'Recommend using 4" spacing per typical detail S-001 for consistency across the project.',
        status: RFIStatus.OPEN,
        priority: Priority.HIGH,
        direction: RFIDirection.OUTGOING,
        urgency: RFIUrgency.URGENT,
        dateNeededBy: new Date('2024-08-10'),
        dateSent: new Date('2024-07-25'),
        clientId: clients[0].id,
        projectId: projects[0].id,
        createdById: admin.id,
      },
    }),
    prisma.rFI.create({
      data: {
        rfiNumber: generateProjectRFINumber('316402'),
        title: 'Material Specification - Wide Flange Beams',
        description: 'Drawing S-201 specifies W24x68 beams but the structural calculations reference W24x76 beams. The beam schedule on S-003 shows W24x68. Please confirm the correct beam size for this application.',
        suggestedSolution: 'Based on span and loading, recommend W24x76 per structural calculations.',
        status: RFIStatus.OPEN,
        priority: Priority.HIGH,
        direction: RFIDirection.OUTGOING,
        urgency: RFIUrgency.NORMAL,
        dateNeededBy: new Date('2024-08-15'),
        dateSent: new Date('2024-07-20'),
        clientId: clients[0].id,
        projectId: projects[0].id,
        createdById: user.id,
      },
    }),
    prisma.rFI.create({
      data: {
        rfiNumber: generateProjectRFINumber('318745'),
        title: 'Crane Rail Support Details',
        description: 'The crane rail support details are not clearly shown for the 25-ton overhead crane. The connection to the building columns needs clarification, particularly the anchor bolt layout and base plate dimensions.',
        suggestedSolution: 'Provide typical crane rail support detail similar to our previous project PRJ-2023-015.',
        status: RFIStatus.CLOSED,
        priority: Priority.URGENT,
        direction: RFIDirection.OUTGOING,
        urgency: RFIUrgency.ASAP,
        dateNeededBy: new Date('2024-07-30'),
        dateSent: new Date('2024-07-15'),
        dateReceived: new Date('2024-07-28'),
        clientId: clients[1].id,
        projectId: projects[1].id,
        createdById: manager.id,
      },
    }),
    prisma.rFI.create({
      data: {
        rfiNumber: generateProjectRFINumber('319856'),
        title: 'Foundation Anchor Bolt Layout',
        description: 'The foundation plan shows 1" diameter anchor bolts but the base plate details show 1.25" diameter bolts. Please confirm the correct anchor bolt size and update the corresponding drawings.',
        status: RFIStatus.OPEN,
        priority: Priority.MEDIUM,
        direction: RFIDirection.OUTGOING,
        urgency: RFIUrgency.NORMAL,
        dateNeededBy: new Date('2024-08-20'),
        dateSent: new Date('2024-07-26'),
        clientId: clients[2].id,
        projectId: projects[2].id,
        createdById: user.id,
      },
    }),
    prisma.rFI.create({
      data: {
        rfiNumber: generateProjectRFINumber('318745'),
        title: 'Fire Protection Requirements',
        description: 'The architectural drawings indicate that certain steel members require fire protection, but the structural drawings do not specify which members or the required rating. Please provide fire protection schedule and member identification.',
        suggestedSolution: 'Request fire protection consultant to provide detailed schedule with member tags.',
        status: RFIStatus.OPEN,
        priority: Priority.MEDIUM,
        direction: RFIDirection.OUTGOING,
        urgency: RFIUrgency.NORMAL,
        dateNeededBy: new Date('2024-08-25'),
        dateSent: new Date('2024-07-22'),
        clientId: clients[1].id,
        projectId: projects[1].id,
        createdById: admin.id,
      },
    }),
  ])

  console.log(`Created ${rfis.length} RFIs`)

  // Create responses for some RFIs
  const responses = []
  
  for (const rfi of rfis) {
    // Initial response acknowledging receipt
    const response1 = await prisma.response.create({
      data: {
        content: `Thank you for RFI ${rfi.rfiNumber}. We have received your inquiry and are reviewing it with our engineering team. We will provide our response within the requested timeframe.`,
        rfiId: rfi.id,
        authorId: manager.id,
      },
    })
    responses.push(response1)

    // Detailed response for some RFIs
    if (rfi.status === RFIStatus.OPEN || rfi.status === RFIStatus.CLOSED) {
      const response2 = await prisma.response.create({
        data: {
          content: `Based on our review of the shop drawings and specifications, we recommend proceeding with the suggested solution. Please refer to the revised detail drawing attached. The connection has been verified to meet all load requirements and code compliance.`,
          rfiId: rfi.id,
          authorId: admin.id,
        },
      })
      responses.push(response2)
    }

    // Final closure response for closed RFIs
    if (rfi.status === RFIStatus.CLOSED) {
      const response3 = await prisma.response.create({
        data: {
          content: `This RFI has been resolved and closed. All parties have been notified of the final decision. Please proceed with fabrication per the clarified requirements. If you have any additional questions, please submit a new RFI.`,
          rfiId: rfi.id,
          authorId: admin.id,
        },
      })
      responses.push(response3)
    }
  }

  console.log(`Created ${responses.length} responses`)

  // Create contacts for clients
  const contacts = await Promise.all([
    // Contacts for Structural Solutions Inc
    prisma.contact.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@structuralsolutions.com',
        phone: '(555) 123-4567',
        title: 'Project Manager',
        clientId: clients[0].id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Mike Chen',
        email: 'mike.chen@structuralsolutions.com',
        phone: '(555) 123-4568',
        title: 'Senior Engineer',
        clientId: clients[0].id,
      },
    }),
    
    // Contacts for Metropolitan Construction
    prisma.contact.create({
      data: {
        name: 'Jennifer Davis',
        email: 'j.davis@metroconstruction.com',
        phone: '(555) 234-5678',
        title: 'Construction Manager',
        clientId: clients[1].id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Robert Kim',
        email: 'robert.kim@metroconstruction.com',
        phone: '(555) 234-5679',
        title: 'Field Supervisor',
        clientId: clients[1].id,
      },
    }),
    
    // Contacts for Atlantic Engineering Corp
    prisma.contact.create({
      data: {
        name: 'Lisa Brown',
        email: 'lisa.brown@atlanticengineering.com',
        phone: '(555) 345-6789',
        title: 'Operations Director',
        clientId: clients[2].id,
      },
    }),
    
    // Contacts for Construction Company
    prisma.contact.create({
      data: {
        name: 'David Wilson',
        email: 'david.wilson@constructioncompany.com',
        phone: '(916) 555-0001',
        title: 'Project Manager',
        clientId: clients[3].id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Amanda Taylor',
        email: 'amanda.taylor@constructioncompany.com',
        phone: '(916) 555-0002', 
        title: 'Technical Coordinator',
        clientId: clients[3].id,
      },
    }),
  ])

  console.log(`Created ${contacts.length} contacts`)

  // Create some settings
  await prisma.settings.createMany({
    data: [
      {
        key: 'company_name',
        value: 'KRAVIS INDUSTRIAL',
        description: 'Company name displayed on RFI forms',
      },
      {
        key: 'company_email',
        value: 'rfis@kravisindustrial.com',
        description: 'Default email for RFI correspondence',
      },
      {
        key: 'rfi_reminder_days',
        value: '3',
        description: 'Days before due date to send reminder',
      },
      {
        key: 'default_rfi_urgency',
        value: 'NORMAL',
        description: 'Default urgency level for new RFIs',
      },
    ],
  })

  console.log('Enhanced seed completed successfully!')
  console.log('\n--- Test Credentials ---')
  console.log('Admin: viktor@kravisindustrial.com / password123')
  console.log('Manager: manager@kravisindustrial.com / password123') 
  console.log('User: detailer@kravisindustrial.com / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })