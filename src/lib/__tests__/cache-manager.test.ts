/**
 * CacheManager Unit Tests
 *
 * Tests for the in-memory cache with TTL support.
 */

import { CacheManager, CacheKeys, CacheTTL } from '../cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    // Create fresh cache for each test (no auto-cleanup)
    cache = new CacheManager(0);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('test-key', 'test-value', 1000);
      const value = cache.get<string>('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should handle different types', () => {
      cache.set('string', 'hello', 1000);
      cache.set('number', 42, 1000);
      cache.set('object', { foo: 'bar' }, 1000);
      cache.set('array', [1, 2, 3], 1000);

      expect(cache.get<string>('string')).toBe('hello');
      expect(cache.get<number>('number')).toBe(42);
      expect(cache.get<any>('object')).toEqual({ foo: 'bar' });
      expect(cache.get<number[]>('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('temp', 'value', 50); // 50ms TTL

      // Should exist immediately
      expect(cache.get('temp')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired
      expect(cache.get('temp')).toBeNull();
    });

    it('should not expire before TTL', async () => {
      cache.set('temp', 'value', 200); // 200ms TTL

      // Wait 50ms
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still exist
      expect(cache.get('temp')).toBe('value');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key', 'value', 1000);
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      cache.set('temp', 'value', 50);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.has('temp')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should delete existing keys', () => {
      cache.set('key', 'value', 1000);
      const deleted = cache.invalidate('key');

      expect(deleted).toBe(true);
      expect(cache.get('key')).toBeNull();
    });

    it('should return false for non-existent keys', () => {
      const deleted = cache.invalidate('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching string pattern', () => {
      cache.set('user:1', 'Alice', 1000);
      cache.set('user:2', 'Bob', 1000);
      cache.set('config:main', 'config', 1000);

      const count = cache.invalidatePattern('user:');
      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('config:main')).toBe('config');
    });

    it('should invalidate keys matching regex pattern', () => {
      cache.set('user:1', 'Alice', 1000);
      cache.set('user:2', 'Bob', 1000);
      cache.set('admin:1', 'Admin', 1000);

      const count = cache.invalidatePattern(/^user:/);
      expect(count).toBe(2);
      expect(cache.get('admin:1')).toBe('Admin');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.set('key3', 'value3', 1000);

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });

    it('should reset statistics', () => {
      cache.set('key', 'value', 1000);
      cache.get('key'); // hit
      cache.get('nonexistent'); // miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('temp1', 'value1', 50);
      cache.set('temp2', 'value2', 50);
      cache.set('permanent', 'value3', 10000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = cache.cleanup();

      expect(removed).toBe(2);
      expect(cache.get('permanent')).toBe('value3');
    });

    it('should return 0 when nothing to clean', () => {
      cache.set('key', 'value', 10000);
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set('key', 'value', 1000);

      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
      expect(stats.size).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key', 'value', 1000);

      // 8 hits
      for (let i = 0; i < 8; i++) {
        cache.get('key');
      }

      // 2 misses
      cache.get('miss1');
      cache.get('miss2');

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(80);
    });
  });

  describe('getEntries', () => {
    it('should return entry information', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 2000);

      const entries = cache.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].key).toBe('key1');
      expect(entries[0].age).toBeGreaterThanOrEqual(0);
      expect(entries[0].ttl).toBeLessThanOrEqual(1000);
      expect(entries[1].key).toBe('key2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cache.set('key', 'cached', 1000);

      let factoryCalled = false;
      const value = await cache.getOrSet(
        'key',
        async () => {
          factoryCalled = true;
          return 'generated';
        },
        1000
      );

      expect(value).toBe('cached');
      expect(factoryCalled).toBe(false);
    });

    it('should call factory and cache result if not exists', async () => {
      const value = await cache.getOrSet(
        'key',
        async () => {
          return 'generated';
        },
        1000
      );

      expect(value).toBe('generated');
      expect(cache.get('key')).toBe('generated');
    });

    it('should support sync factory functions', async () => {
      const value = await cache.getOrSet(
        'key',
        () => {
          return 'sync-value';
        },
        1000
      );

      expect(value).toBe('sync-value');
    });
  });
});

describe('CacheKeys', () => {
  it('should build config keys', () => {
    const key = CacheKeys.config('/path/to/config.yml');
    expect(key).toBe('config:/path/to/config.yml');
  });

  it('should build message keys', () => {
    const key = CacheKeys.message('msg_abc123');
    expect(key).toBe('message:msg_abc123');
  });

  it('should build inbox keys', () => {
    const key = CacheKeys.inbox('user@example.com');
    expect(key).toBe('inbox:user@example.com:1');

    const key2 = CacheKeys.inbox('user@example.com', 2);
    expect(key2).toBe('inbox:user@example.com:2');
  });

  it('should build user keys', () => {
    const key = CacheKeys.user('user@example.com');
    expect(key).toBe('user:user@example.com');
  });

  it('should build server keys', () => {
    const key = CacheKeys.server('postal.example.com');
    expect(key).toBe('server:postal.example.com');
  });
});

describe('CacheTTL', () => {
  it('should have correct TTL values', () => {
    expect(CacheTTL.SHORT).toBe(30 * 1000);
    expect(CacheTTL.MEDIUM).toBe(5 * 60 * 1000);
    expect(CacheTTL.LONG).toBe(30 * 60 * 1000);
    expect(CacheTTL.VERY_LONG).toBe(24 * 60 * 60 * 1000);
  });
});
