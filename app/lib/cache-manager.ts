interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, item)
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Generate cache key for API requests
  generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : ''
    return `${endpoint}${paramString}`
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  // Invalidate products-related cache
  invalidateProducts(): void {
    this.invalidatePattern('/api/products')
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; hits: number; misses: number; hitRate: number; maxSize: number; strategy: string } {
    return {
      size: this.cache.size,
      hits: 0, // Placeholder - would need to track hits/misses
      misses: 0, // Placeholder - would need to track hits/misses
      hitRate: 0, // Placeholder - would need to track hits/misses
      maxSize: 1000, // Placeholder
      strategy: 'LRU' // Placeholder
    }
  }
}

// Create singleton instance
export const cacheManager = new CacheManager()

// Cleanup expired items every 10 minutes
setInterval(() => {
  cacheManager.cleanup()
}, 10 * 60 * 1000)

export default cacheManager