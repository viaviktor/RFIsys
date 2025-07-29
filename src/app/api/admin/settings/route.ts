import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const key = searchParams.get('key')

    let where: any = {}
    
    if (category) {
      where.key = {
        startsWith: `${category}.`
      }
    }
    
    if (key) {
      where.key = key
    }

    const settings = await prisma.settings.findMany({
      where,
      orderBy: [
        { key: 'asc' }
      ],
    })

    // Group settings by category for easier frontend handling
    const groupedSettings = settings.reduce((acc, setting) => {
      const [category, ...keyParts] = setting.key.split('.')
      const settingKey = keyParts.join('.')
      
      if (!acc[category]) {
        acc[category] = {}
      }
      
      acc[category][settingKey] = {
        id: setting.id,
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updatedAt,
      }
      
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      data: key ? settings[0] || null : groupedSettings,
      raw: settings,
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { key, value, description } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Validate key format (should be category.setting)
    if (!key.includes('.')) {
      return NextResponse.json(
        { error: 'Key must be in format "category.setting"' },
        { status: 400 }
      )
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: {
        value: String(value),
        description,
      },
      create: {
        key,
        value: String(value),
        description,
      },
    })

    return NextResponse.json({ data: setting })
  } catch (error) {
    console.error('Create/update setting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { settings } = await request.json()

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    // Bulk update settings
    const updatedSettings = []
    
    for (const { key, value, description } of settings) {
      if (!key || value === undefined) {
        continue
      }

      const setting = await prisma.settings.upsert({
        where: { key },
        update: {
          value: String(value),
          description,
        },
        create: {
          key,
          value: String(value),
          description,
        },
      })
      
      updatedSettings.push(setting)
    }

    return NextResponse.json({ 
      data: updatedSettings,
      message: `Updated ${updatedSettings.length} settings` 
    })
  } catch (error) {
    console.error('Bulk update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    await prisma.settings.delete({
      where: { key }
    })

    return NextResponse.json({ message: 'Setting deleted successfully' })
  } catch (error) {
    console.error('Delete setting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}