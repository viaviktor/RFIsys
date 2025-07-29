import { NextResponse } from 'next/server'

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000

  set(key: string, data: any, ttlSeconds: number = 300): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new MemoryCache()

export function withCache(
  handler: () => Promise<any>,
  cacheKey: string,
  ttlSeconds: number = 300
) {
  return async () => {
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const result = await handler()
    cache.set(cacheKey, result, ttlSeconds)
    return result
  }
}

export function createCachedResponse(
  data: any,
  options: {
    status?: number
    headers?: Record<string, string>
    maxAge?: number
  } = {}
): NextResponse {
  const {
    status = 200,
    headers = {},
    maxAge = 300,
  } = options

  const response = NextResponse.json(data, { status })
  
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`)
  response.headers.set('X-Cache-TTL', maxAge.toString())
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}