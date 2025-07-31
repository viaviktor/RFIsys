import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET(request: NextRequest) {
  console.log('🔍 PDF Debug Test Starting...')
  
  try {
    // Environment diagnostics
    const diagnostics = {
      NODE_ENV: process.env.NODE_ENV,
      DISPLAY: process.env.DISPLAY,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      CHROME_BIN: process.env.CHROME_BIN,
      CHROME_PATH: process.env.CHROME_PATH,
      CHROMIUM_PATH: process.env.CHROMIUM_PATH,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
    }
    
    console.log('🔧 Environment Variables:', diagnostics)
    
    // Check if Chromium exists
    const fs = require('fs')
    const chromiumPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ]
    
    const chromiumStatus = chromiumPaths.map(path => ({
      path,
      exists: fs.existsSync(path),
      stats: fs.existsSync(path) ? fs.statSync(path) : null
    }))
    
    console.log('📁 Chromium File Status:', chromiumStatus)
    
    // Test basic HTML to PDF
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PDF Test</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .test-box { border: 2px solid #333; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>PDF Generation Test</h1>
          <div class="test-box">
            <h2>Test Content</h2>
            <p>This is a test document to verify PDF generation is working.</p>
            <p>Current time: ${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `
    
    console.log('🚀 Launching Puppeteer...')
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--virtual-time-budget=5000',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-client-side-phishing-detection',
        '--disable-sync',
        '--no-first-run'
      ],
      timeout: 30000,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
    })
    
    console.log('✅ Browser launched successfully')
    
    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })
    
    console.log('📄 Setting HTML content...')
    await page.setContent(testHTML, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    })
    
    console.log('🖨️ Generating PDF...')
    const pdf = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      timeout: 15000
    })
    
    await browser.close()
    console.log('🎉 PDF generated successfully! Size:', pdf.length, 'bytes')
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', 'attachment; filename="pdf-debug-test.pdf"')
    headers.set('Content-Length', pdf.length.toString())
    
    return new NextResponse(Buffer.from(pdf), { headers })
    
  } catch (error) {
    console.error('❌ PDF Debug Test Error:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    const errorInfo = {
      error: 'PDF generation test failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DISPLAY: process.env.DISPLAY,
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      }
    }
    
    return NextResponse.json(errorInfo, { status: 500 })
  }
}