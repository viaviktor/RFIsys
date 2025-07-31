import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET(request: NextRequest) {
  let browser
  try {
    console.log('=== Testing Puppeteer in Alpine Linux ===')
    
    // Check browser executables first
    const fs = require('fs')
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ].filter(Boolean)

    let executablePath = null
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        executablePath = path
        break
      }
    }

    if (!executablePath) {
      throw new Error('No Chromium browser found')
    }

    console.log('Using browser executable:', executablePath)

    // Try to launch with crashpad completely disabled for Alpine 3.21
    console.log('Launching browser with crashpad disabled for Alpine Linux...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--user-data-dir=/tmp/chromium-profile',
        // Nuclear option: disable crashpad entirely
        '--disable-crash-reporter',
        '--disable-breakpad',
        '--no-crash-upload',
        '--crash-dumps-dir=/dev/null',
        '--enable-crash-reporter=false'
      ],
      timeout: 30000,
      executablePath: executablePath,
      env: {
        ...process.env,
        CHROME_CRASHPAD_PIPE_NAME: '/dev/null',
        CHROME_CRASHDUMP_DIR: '/dev/null'
      }
    })

    console.log('Browser launched successfully!')

    // Create a simple page
    console.log('Creating new page...')
    const page = await browser.newPage()

    // Set simple HTML
    console.log('Setting HTML content...')
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <h1>Test PDF Generation</h1>
          <p>This is a simple test for PDF generation in Alpine Linux.</p>
          <p>Generated at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `, { waitUntil: 'networkidle0', timeout: 10000 })

    // Generate PDF
    console.log('Generating PDF...')
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      timeout: 10000
    })

    console.log('PDF generated successfully! Size:', pdf.length, 'bytes')

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Puppeteer test successful',
      pdfSize: pdf.length,
      browser: executablePath,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Puppeteer test failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? (error as any).cause : undefined
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })

  } finally {
    if (browser) {
      try {
        await browser.close()
        console.log('Browser closed successfully')
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
  }
}