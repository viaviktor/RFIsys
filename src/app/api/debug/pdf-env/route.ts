import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const fs = require('fs')
    
    // Check browser executables
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ].filter(Boolean)

    const browserInfo = possiblePaths.map(path => ({
      path,
      exists: fs.existsSync(path)
    }))

    // Check environment
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      DISPLAY: process.env.DISPLAY,
      USER: process.env.USER,
      HOME: process.env.HOME
    }

    // Check system info
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd()
    }

    // Try to read /etc/os-release for OS info
    let osInfo = 'Unknown'
    try {
      if (fs.existsSync('/etc/os-release')) {
        osInfo = fs.readFileSync('/etc/os-release', 'utf8')
      }
    } catch (e) {
      osInfo = 'Could not read OS info'
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment,
      systemInfo,
      browserInfo,
      osInfo
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}