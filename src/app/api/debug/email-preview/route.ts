import { NextRequest, NextResponse } from 'next/server'
import { generateRFICreatedEmail, generateRFIResponseEmail, generateRFIReminderEmail } from '@/lib/email'

// Sample data for email template preview
const sampleRFI = {
  id: 'preview-123',
  rfiNumber: 'RFI-2024-001',
  title: 'Steel Beam Connection Details',
  description: 'Please provide clarification on the connection details for the main steel beams as shown in drawing S-101. The current specifications are unclear regarding bolt spacing and welding requirements.',
  suggestedSolution: 'Recommend using 3/4" diameter bolts with 3" spacing center-to-center. Add fillet welds along the connection plates as per AWS D1.1 standards.',
  status: 'OPEN' as const,
  priority: 'HIGH' as const,
  urgency: 'URGENT' as const,
  direction: 'OUTGOING' as const,
  dateNeededBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dateSent: new Date().toISOString(),
  dateReceived: null,
  reminderSent: null,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  clientId: 'client-1',
  projectId: 'project-1',
  createdById: 'user-1',
  client: {
    id: 'client-1',
    name: 'Steel Construction Corp',
    contactName: 'John Smith',
    email: 'john.smith@steelcorp.com',
    phone: '(555) 123-4567',
    address: '123 Industrial Way',
    city: 'Construction City',
    state: 'TX',
    zipCode: '75001',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  project: {
    id: 'project-1',
    name: 'Downtown Office Complex - Phase 2',
    description: 'Construction of 15-story office building with steel frame structure',
    projectNumber: 'DOC-P2-2024',
    status: 'ACTIVE' as const,
    clientId: 'client-1',
    managerId: 'manager-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  createdBy: {
    id: 'user-1',
    name: 'Mike Johnson',
    email: 'mike.johnson@rfisystem.com',
    role: 'USER' as const,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const sampleResponse = {
  content: 'Thank you for the RFI. After reviewing the structural drawings, we recommend proceeding with the suggested 3/4" bolt configuration. However, please note that the fillet welds should be 1/4" minimum size to meet the load requirements. Please find the revised detail drawing attached.\n\nAdditionally, ensure all welding is performed by certified welders per AWS D1.1 standards.',
  author: {
    id: 'user-2',
    name: 'Sarah Davis',
    email: 'sarah.davis@steelcorp.com',
    role: 'USER' as const,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  createdAt: new Date().toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const template = searchParams.get('template') || 'created'
    const format = searchParams.get('format') || 'html'

    let emailContent: { subject: string; html: string; text: string }

    switch (template) {
      case 'created':
        emailContent = generateRFICreatedEmail(sampleRFI)
        break
      
      case 'response':
        emailContent = generateRFIResponseEmail(sampleRFI, sampleResponse)
        break
      
      case 'reminder':
        const reminderType = searchParams.get('type') as 'due_tomorrow' | 'overdue' || 'due_tomorrow'
        const daysOverdue = reminderType === 'overdue' ? 3 : undefined
        emailContent = generateRFIReminderEmail(sampleRFI, reminderType, daysOverdue)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid template. Use: created, response, or reminder' },
          { status: 400 }
        )
    }

    // Return HTML for browser viewing or text for debugging
    if (format === 'text') {
      return new NextResponse(emailContent.text, {
        headers: { 'Content-Type': 'text/plain' }
      })
    } else if (format === 'json') {
      return NextResponse.json(emailContent)
    } else {
      // Return HTML for browser viewing
      return new NextResponse(emailContent.html, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

  } catch (error) {
    console.error('Email preview error:', error)
    return NextResponse.json(
      { error: 'Failed to generate email preview' },
      { status: 500 }
    )
  }
}