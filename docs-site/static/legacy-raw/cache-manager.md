# CacheManager

In-memory cache with TTL (Time To Live) support for improved performance.

## Overview

The `CacheManager` provides a simple, fast in-memory cache with automatic expiration. It's used to cache frequently accessed data like configuration files and message metadata, reducing I/O operations and API calls.

## Features

- ✅ **TTL Support** - Automatic expiration of cached entries
- ✅ **Type Safe** - Full TypeScript generics support
- ✅ **Statistics** - Hit/miss tracking and cache analytics
- ✅ **Pattern Invalidation** - Bulk invalidation with regex patterns
- ✅ **Auto Cleanup** - Background cleanup of expired entries
- ✅ **Lazy Loading** - `getOrSet()` for easy cache-aside pattern
- ✅ **Debug Logging** - Integration with debug logger

## Basic Usage

### Importing

```typescript
import { cacheManager, CacheKeys, CacheTTL } from './lib/cache-manager';
```

### Setting Values

```typescript
// Cache a value for 5 minutes
cacheManager.set('user:123', { name: 'John' }, CacheTTL.MEDIUM);

// Cache with custom TTL (30 seconds)
cacheManager.set('temp:data', someValue, 30 * 1000);
```

### Getting Values

```typescript
// Get typed value
const user = cacheManager.get<User>('user:123');

if (user) {
  console.log(`Found user: ${user.name}`);
} else {
  console.log('User not in cache');
}
```

### Cache-Aside Pattern

```typescript
// Get from cache, or generate if not found
const config = await cacheManager.getOrSet(
  'config:main',
  async () => {
    // This only runs if cache misses
    return await loadConfigFromFile();
  },
  CacheTTL.MEDIUM
);
```

## Cache Keys

Use the provided `CacheKeys` builders for consistency:

```typescript
// Config cache key
const key = CacheKeys.config('/path/to/config.yml');
// Result: "config:/path/to/config.yml"

// Message metadata
const msgKey = CacheKeys.message('msg_abc123');
// Result: "message:msg_abc123"

// Inbox list
const inboxKey = CacheKeys.inbox('user@example.com', 1);
// Result: "inbox:user@example.com:1"

// User info
const userKey = CacheKeys.user('user@example.com');
// Result: "user:user@example.com"

// Server info
const serverKey = CacheKeys.server('postal.example.com');
// Result: "server:postal.example.com"
```

## TTL Constants

Predefined TTL values for common use cases:

```typescript
CacheTTL.SHORT; // 30 seconds
CacheTTL.MEDIUM; // 5 minutes
CacheTTL.LONG; // 30 minutes
CacheTTL.VERY_LONG; // 24 hours
```

## API Reference

### Constructor

```typescript
new CacheManager(autoCleanupMs?: number)
```

Creates a cache manager with optional automatic cleanup interval.

**Parameters:**

- `autoCleanupMs` - Cleanup interval in milliseconds (default: 60000 = 1 minute)

**Example:**

```typescript
// Custom cache with 30-second cleanup
const cache = new CacheManager(30000);
```

### Methods

#### `set<T>(key: string, value: T, ttl: number): void`

Store a value with TTL.

**Parameters:**

- `key` - Cache key
- `value` - Value to store
- `ttl` - Time to live in milliseconds

**Example:**

```typescript
cacheManager.set('user:123', user, 300000); // 5 minutes
```

#### `get<T>(key: string): T | null`

Retrieve a value from cache.

**Returns:** Cached value or `null` if not found/expired

**Example:**

```typescript
const user = cacheManager.get<User>('user:123');
```

#### `has(key: string): boolean`

Check if key exists and is valid.

**Returns:** `true` if key exists and hasn't expired

**Example:**

```typescript
if (cacheManager.has('config:main')) {
  // Config is cached
}
```

#### `invalidate(key: string): boolean`

Delete a specific cache entry.

**Returns:** `true` if key was deleted

**Example:**

```typescript
cacheManager.invalidate('user:123');
```

#### `invalidatePattern(pattern: string | RegExp): number`

Invalidate all keys matching a pattern.

**Returns:** Number of keys invalidated

**Example:**

```typescript
// Invalidate all user entries
cacheManager.invalidatePattern(/^user:/);

// Invalidate specific message
cacheManager.invalidatePattern('message:msg_.*');
```

#### `clear(): void`

Clear all cache entries and reset statistics.

**Example:**

```typescript
cacheManager.clear();
```

#### `cleanup(): number`

Manually remove expired entries.

**Returns:** Number of entries removed

**Note:** This runs automatically on the cleanup interval.

**Example:**

```typescript
const removed = cacheManager.cleanup();
console.log(`Removed ${removed} expired entries`);
```

#### `getStats(): CacheStats`

Get cache statistics.

**Returns:** Object with hits, misses, size, and hitRate

**Example:**

```typescript
const stats = cacheManager.getStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
console.log(`Cache size: ${stats.size} entries`);
```

#### `getEntries(): Array<{ key: string; age: number; ttl: number }>`

Get detailed info about all cache entries.

**Returns:** Array of entries with key, age, and remaining TTL

**Example:**

```typescript
const entries = cacheManager.getEntries();
entries.forEach((e) => {
  console.log(`${e.key}: age=${e.age}ms, ttl=${e.ttl}ms`);
});
```

#### `getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl: number): Promise<T>`

Get from cache or generate (cache-aside pattern).

**Parameters:**

- `key` - Cache key
- `factory` - Function to generate value if not cached
- `ttl` - Time to live for generated value

**Returns:** Cached or newly generated value

**Example:**

```typescript
const config = await cacheManager.getOrSet(
  'config:main',
  async () => loadConfig(),
  CacheTTL.MEDIUM
);
```

#### `destroy(): void`

Stop cleanup timer and clear all entries.

**Example:**

```typescript
cacheManager.destroy();
```

## Integration Examples

### Config Caching

```typescript
class ConfigManager {
  load(): Config {
    const cacheKey = CacheKeys.config(this.configPath);

    // Try cache first
    const cached = cacheManager.get<Config>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load from file
    const config = this.loadFromFile();

    // Cache for 5 minutes
    cacheManager.set(cacheKey, config, CacheTTL.MEDIUM);

    return config;
  }

  save(config: Config): void {
    this.saveToFile(config);

    // Invalidate cache after save
    const cacheKey = CacheKeys.config(this.configPath);
    cacheManager.invalidate(cacheKey);
  }
}
```

### Message Metadata Caching

```typescript
class PostalClient {
  async getMessage(id: string): Promise<Message> {
    const cacheKey = CacheKeys.message(id);

    return await cacheManager.getOrSet(
      cacheKey,
      async () => {
        // Only calls API if not cached
        return await this.api.getMessage(id);
      },
      CacheTTL.SHORT
    );
  }
}
```

### Inbox List Caching

```typescript
async function getInbox(email: string, page: number = 1): Promise<Message[]> {
  const cacheKey = CacheKeys.inbox(email, page);

  return await cacheManager.getOrSet(
    cacheKey,
    async () => await fetchInboxFromAPI(email, page),
    CacheTTL.SHORT // 30 seconds
  );
}
```

## Performance Impact

### Before Caching

```
Config load time: ~5-10ms (file I/O)
API calls: Every request
```

### After Caching

```
Config load time (cached): ~0.01ms (memory access)
API calls: Only on cache miss
Typical hit rate: 80-95%
```

### Benchmark Results

```bash
npm run bench:config

# Sample output:
Config Loading x 10,000 ops/sec
  Without cache: 200 ops/sec (5ms per op)
  With cache:    20,000 ops/sec (0.05ms per op)
  Improvement:   100x faster
```

## Cache Statistics

### Monitoring

```typescript
// Periodic stats logging
setInterval(() => {
  const stats = cacheManager.getStats();
  console.log(`Cache stats: ${JSON.stringify(stats)}`);
}, 60000);
```

### Example Output

```json
{
  "hits": 8523,
  "misses": 147,
  "size": 42,
  "hitRate": 98.3
}
```

## Best Practices

### 1. Use Appropriate TTL

```typescript
// Frequently changing data: SHORT (30s)
cacheManager.set(key, data, CacheTTL.SHORT);

// Configuration: MEDIUM (5min)
cacheManager.set(key, config, CacheTTL.MEDIUM);

// Static reference data: LONG (30min)
cacheManager.set(key, refData, CacheTTL.LONG);

// Daily aggregates: VERY_LONG (24h)
cacheManager.set(key, daily, CacheTTL.VERY_LONG);
```

### 2. Invalidate on Mutations

```typescript
// Always invalidate after updates
async function updateUser(id: string, data: UserUpdate) {
  await api.updateUser(id, data);

  // Invalidate cache
  cacheManager.invalidate(CacheKeys.user(id));
}
```

### 3. Use Consistent Key Patterns

```typescript
// Good: Use CacheKeys builders
const key = CacheKeys.config(path);

// Bad: Inconsistent manual keys
const key = `config-${path}`;
const key2 = `${path}:config`;
```

### 4. Handle Cache Misses Gracefully

```typescript
const data = cacheManager.get<Data>('key');

if (!data) {
  // Always have a fallback
  return await loadDataFromSource();
}
```

### 5. Monitor Hit Rates

```typescript
// Log stats periodically
const stats = cacheManager.getStats();

if (stats.hitRate < 70) {
  console.warn(`Low cache hit rate: ${stats.hitRate}%`);
  // Consider adjusting TTL or cache strategy
}
```

## Limitations

1. **In-Memory Only** - Cache is lost on restart
2. **Single Process** - Not shared across multiple processes
3. **No Persistence** - No disk storage
4. **Memory Limits** - Large caches consume RAM

## Future Enhancements

Potential improvements:

1. **LRU Eviction** - Limit cache size with LRU policy
2. **Compression** - Compress large cached values
3. **Persistence** - Optional disk backing
4. **Multi-Process** - Redis or shared memory support
5. **Tiered Cache** - Memory + disk tiers
6. **Metrics** - Prometheus-style metrics export

## Troubleshooting

### Cache Not Working

```typescript
// Check if key is cached
console.log(cacheManager.has('key')); // false?

// Check expiry
const entries = cacheManager.getEntries();
console.log(entries); // Check TTL values
```

### Memory Usage

```typescript
// Monitor cache size
const stats = cacheManager.getStats();
console.log(`Cache entries: ${stats.size}`);

// Clear if too large
if (stats.size > 10000) {
  cacheManager.clear();
}
```

### Low Hit Rate

```typescript
const stats = cacheManager.getStats();

if (stats.hitRate < 50) {
  // TTL might be too short
  // Increase TTL or check if data is accessed multiple times
}
```

## Related Documentation

- [Performance Benchmarks](../benchmarks/README.md)
- [Configuration Guide](./configuration.md)
- [Debugging Guide](./debugging.md)
