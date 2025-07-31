import { NextRequest, NextResponse } from 'next/server'
import { generateRFIPDF, RFIPDFData } from '@/lib/pdf'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Testing PDFKit PDF Generation ===')
    
    // Create a sample RFI data for testing
    const testRFI: RFIPDFData = {
      id: 'test-1',
      rfiNumber: 'TEST-001',
      title: 'PDF Generation Test',
      description: 'This is a test RFI to verify that PDFKit-based PDF generation is working correctly in the production environment.',
      status: 'OPEN',
      priority: 'MEDIUM',
      category: 'TECHNICAL',
      direction: 'OUTGOING',
      urgency: 'NORMAL',
      createdAt: new Date().toISOString(),
      client: {
        id: 'test-client',
        name: 'Test Client Company',
        contactName: 'John Doe',
        email: 'john@testclient.com',
        phone: '555-0123',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      project: {
        id: 'test-project',
        name: 'Test Construction Project',
        projectNumber: 'PROJ-2025-001',
        description: 'A test project for PDF generation',
        status: 'ACTIVE',
        clientId: 'test-client',
        managerId: 'test-manager',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      createdBy: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      attachments: [
        {
          id: 'test-attachment',
          filename: 'test-drawing.pdf',
          storedName: 'test-drawing-uuid.pdf',
          size: 1024000,
          mimeType: 'application/pdf',
          url: '/api/attachments/test-drawing-uuid.pdf',
          rfiId: 'test-1',
          uploadedBy: 'test-user',
          createdAt: new Date().toISOString()
        }
      ]
    }

    console.log('Generating test PDF with PDFKit...')
    const result = await generateRFIPDF(testRFI)
    
    console.log('PDFKit test successful! PDF size:', result.buffer.length, 'bytes')

    // Return success
    return NextResponse.json({
      success: true,
      message: 'PDFKit test successful',
      pdfSize: result.buffer.length,
      contentType: result.contentType,
      filename: result.filename,
      isPDF: result.isPDF,
      generator: 'PDFKit',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('PDFKit test failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      generator: 'PDFKit',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}