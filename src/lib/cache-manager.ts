/**
 * Cache Manager
 *
 * Simple in-memory cache with TTL (Time To Live) support.
 * Used for caching config, message metadata, and other frequently accessed data.
 */

import { debugLogger } from './debug';

/**
 * Cache entry with value and expiry timestamp
 */
interface CacheEntry<T = any> {
  value: T;
  expiry: number;
  createdAt: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * CacheManager class
 *
 * Provides a simple in-memory cache with automatic expiration.
 * Thread-safe for single-process use.
 */
export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Create a new CacheManager
   * @param autoCleanupMs Optional interval for automatic cleanup (default: 60000ms = 1 minute)
   */
  constructor(autoCleanupMs: number = 60000) {
    this.cache = new Map();

    // Set up automatic cleanup if interval provided
    if (autoCleanupMs > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, autoCleanupMs);

      // Don't keep the process alive just for cleanup
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }

    debugLogger.log('cache', `CacheManager initialized with ${autoCleanupMs}ms cleanup interval`);
  }

  /**
   * Store a value in the cache with TTL
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttl: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiry: now + ttl,
      createdAt: now,
    };

    this.cache.set(key, entry);
    debugLogger.log('cache', `Set cache key: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * Retrieve a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      debugLogger.log('cache', `Cache miss: ${key}`);
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      debugLogger.log('cache', `Cache expired: ${key}`);
      return null;
    }

    this.hits++;
    debugLogger.log('cache', `Cache hit: ${key}`);
    return entry.value as T;
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();

    if (now > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate (delete) a specific cache key
   * @param key Cache key to invalidate
   * @returns true if key was deleted, false if not found
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      debugLogger.log('cache', `Invalidated cache key: ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidate all keys matching a pattern
   * @param pattern String or RegExp pattern to match keys
   * @returns Number of keys invalidated
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      debugLogger.log('cache', `Invalidated ${count} keys matching pattern: ${pattern}`);
    }

    return count;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    debugLogger.log('cache', `Cleared ${size} cache entries`);
  }

  /**
   * Remove expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      debugLogger.log('cache', `Cleanup removed ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
    };
  }

  /**
   * Get detailed information about cache entries
   * @returns Array of cache entry info
   */
  getEntries(): Array<{ key: string; age: number; ttl: number }> {
    const now = Date.now();
    const entries: Array<{ key: string; age: number; ttl: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: now - entry.createdAt,
        ttl: Math.max(0, entry.expiry - now),
      });
    }

    return entries;
  }

  /**
   * Get or set a cached value (lazy initialization)
   * @param key Cache key
   * @param factory Function to generate value if not cached
   * @param ttl Time to live in milliseconds
   * @returns Cached or newly generated value
   */
  async getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl: number): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    debugLogger.log('cache', `Cache miss for key: ${key}, generating value...`);
    const value = await factory();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Destroy the cache manager and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clear();
    debugLogger.log('cache', 'CacheManager destroyed');
  }
}

// Export singleton instance with default settings
export const cacheManager = new CacheManager();

/**
 * Cache key builders for common use cases
 */
export const CacheKeys = {
  /**
   * Config cache key
   */
  config: (path: string): string => `config:${path}`,

  /**
   * Message metadata cache key
   */
  message: (messageId: string): string => `message:${messageId}`,

  /**
   * Inbox list cache key
   */
  inbox: (email: string, page: number = 1): string => `inbox:${email}:${page}`,

  /**
   * User info cache key
   */
  user: (email: string): string => `user:${email}`,

  /**
   * Server info cache key
   */
  server: (hostname: string): string => `server:${hostname}`,
};

/**
 * Default TTL values (in milliseconds)
 */
export const CacheTTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};
