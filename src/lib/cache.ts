/**
 * Cache layer for Pulseboard
 * Simple in-memory cache with fallback to database
 */

import { db } from './db';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data
 */
export async function getCached<T>(key: string): Promise<T | null> {
  // Check memory first
  const memEntry = cache.get(key);
  if (memEntry && memEntry.expiresAt > Date.now()) {
    return memEntry.data as T;
  }
  
  // Clean up expired memory entry
  if (memEntry) {
    cache.delete(key);
  }

  // Check database
  try {
    const dbEntry = await db.polygonCache.findUnique({
      where: { cacheKey: key },
    });

    if (dbEntry && new Date(dbEntry.expiresAt) > new Date()) {
      const data = JSON.parse(dbEntry.data);
      // Restore to memory
      cache.set(key, {
        data,
        expiresAt: new Date(dbEntry.expiresAt).getTime(),
      });
      return data as T;
    }

    // Clean up expired DB entry
    if (dbEntry) {
      await db.polygonCache.delete({ where: { cacheKey: key } }).catch(() => {});
    }
  } catch (error) {
    console.error('[Cache] DB read error:', error);
  }

  return null;
}

/**
 * Set cached data
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;

  // Set in memory
  cache.set(key, { data, expiresAt });

  // Persist to DB (async, don't wait)
  db.polygonCache
    .upsert({
      where: { cacheKey: key },
      update: {
        data: JSON.stringify(data),
        expiresAt: new Date(expiresAt),
      },
      create: {
        cacheKey: key,
        endpoint: key.split(':')[0] || 'unknown',
        data: JSON.stringify(data),
        expiresAt: new Date(expiresAt),
      },
    })
    .catch((error) => {
      console.error('[Cache] DB write error:', error);
    });
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  cache.clear();
  
  try {
    await db.polygonCache.deleteMany({});
  } catch (error) {
    console.error('[Cache] Clear error:', error);
  }
}

/**
 * Clean up expired entries (run periodically)
 */
export async function cleanupExpired(): Promise<void> {
  // Clean memory
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
    }
  }

  // Clean DB
  try {
    await db.polygonCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('[Cache] Cleanup error:', error);
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}
