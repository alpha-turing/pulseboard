/**
 * Improved Caching Layer with LRU Eviction
 * 
 * Features:
 * - In-memory LRU cache with size limits
 * - Request deduplication to prevent concurrent duplicate requests
 * - Ready for Redis migration
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: Map<string, number>;
  private maxSize: number;
  private accessCounter: number;

  constructor(maxSize: number = 500) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.maxSize = maxSize;
    this.accessCounter = 0;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.data;
  }

  set(key: string, value: any, ttlSeconds: number = 300): void {
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now(),
    });
    this.accessOrder.set(key, ++this.accessCounter);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance
export const cache = new LRUCache(500);

// Request deduplication map
export const inflightRequests = new Map<string, Promise<any>>();

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Deduplicated fetch wrapper
 * Prevents multiple concurrent requests for the same key
 */
export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Check cache first
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Check if request is already in flight
  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight;
  }

  // Execute fetch and cache result
  const promise = fetcher()
    .then(result => {
      cache.set(key, result, ttlSeconds);
      return result;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

/*
 * Production Redis Migration Guide:
 * 
 * 1. Install ioredis: npm install ioredis
 * 2. Replace cache implementation:
 * 
 * import { Redis } from 'ioredis';
 * 
 * const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
 * 
 * export const cache = {
 *   async get(key: string) {
 *     const value = await redis.get(key);
 *     return value ? JSON.parse(value) : null;
 *   },
 *   async set(key: string, value: any, ttl: number) {
 *     await redis.setex(key, ttl, JSON.stringify(value));
 *   },
 *   async delete(key: string) {
 *     await redis.del(key);
 *   },
 *   async clear() {
 *     await redis.flushdb();
 *   }
 * };
 */
