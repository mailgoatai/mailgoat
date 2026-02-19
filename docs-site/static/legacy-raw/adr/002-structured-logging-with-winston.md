# ADR-002: Structured Logging with Winston

**Status:** ACCEPTED  
**Date:** 2026-02-18  
**Deciders:** @lead-engineer  
**Tags:** logging, observability, debugging

---

## Context

MailGoat currently uses `console.log()` and `console.error()` for all output. This approach has several problems:

1. **No Log Levels:** Can't filter debug vs info vs error messages
2. **No Structure:** Logs are unstructured text, hard to parse
3. **No Production Logging:** Can't log to files or external services
4. **No Context:** Missing metadata like timestamps, request IDs
5. **Mixed Concerns:** User output mixed with debug logs
6. **No Control:** Can't disable logs, can't route to different destinations

For a production CLI tool, especially one maintained by AI agents, we need structured, filterable logging that can be used for debugging and monitoring.

---

## Decision

**We will implement structured logging using Winston.**

All `console.log()` calls will be replaced with proper logging using Winston, with support for different log levels, structured data, and multiple transports.

---

## Rationale

### Why We Need Structured Logging

1. **Production Debugging**
   - Users report issues → need logs to investigate
   - Can't attach debugger to production
   - Need historical context

2. **Multi-Agent Development**
   - Agents need to debug their changes
   - Logs help understand behavior
   - Easier to troubleshoot integration issues

3. **User Experience**
   - Separate user-facing output from debug logs
   - Users shouldn't see debug spam
   - Developers need detailed information

4. **Monitoring**
   - Track usage patterns
   - Monitor errors and warnings
   - Performance metrics

### Why Winston

1. **Industry Standard**
   - Most popular Node.js logging library (2.7M weekly downloads)
   - Well-maintained, stable
   - Large ecosystem

2. **Features Match Our Needs**
   - Multiple log levels (error, warn, info, debug)
   - Structured logging (metadata objects)
   - Multiple transports (console, file, external services)
   - Log rotation built-in
   - Excellent TypeScript support

3. **Flexibility**
   - Can start simple, add features later
   - Easy to add new transports
   - Configurable formatting

4. **Performance**
   - Async logging doesn't block
   - Efficient for CLI tools
   - Minimal overhead

---

## Consequences

### Positive

1. **Better Debugging:** Can trace issues through structured logs
2. **User Experience:** Clean output for users, detailed logs for developers
3. **Production Ready:** Logs to files, can investigate issues remotely
4. **Multi-Agent Friendly:** Clear logging patterns, easy to add logs
5. **Monitoring:** Can track errors, warnings, usage patterns
6. **Professional:** Industry-standard approach

### Negative

1. **Dependency:** Adds Winston (~60KB)
2. **Migration Effort:** Replace all console.log (6-8 hours)
3. **Slightly More Verbose:** `logger.info()` vs `console.log()`
4. **Learning Curve:** Need to understand log levels

### Neutral

1. **Pattern Change:** All logging must use logger
2. **Configuration:** Need to configure transports
3. **File Management:** Need to handle log file rotation

---

## Implementation Plan

### Phase 1: Setup Winston (2 hours)

```typescript
// src/infrastructure/logger.ts
import winston from 'winston';
import path from 'path';

const logDir = path.join(os.homedir(), '.mailgoat', 'logs');

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console for development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // File for production
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});
```

### Phase 2: Replace console.log (3-4 hours)

Pattern for replacement:

```typescript
// BEFORE
console.log('Sending email to', recipients);
console.error('Failed to send:', error);

// AFTER
logger.info('Sending email', { recipients, messageId });
logger.error('Failed to send email', { error: error.message, stack: error.stack });
```

### Phase 3: Add Debug Mode (1-2 hours)

```typescript
// Add --debug flag to all commands
.option('--debug', 'Enable debug logging')

// Set log level based on flag
if (options.debug) {
  logger.level = 'debug';
}

// Add debug logs
logger.debug('PostalClient initialized', { apiUrl, headers });
logger.debug('HTTP request', { method: 'POST', url, body });
```

### Phase 4: Silent Mode (1 hour)

```typescript
// Add --silent flag for JSON output mode
.option('--silent', 'Suppress all output except JSON')

if (options.silent) {
  logger.transports.forEach(t => t.silent = true);
}
```

---

## Log Levels

### When to Use Each Level

- **error:** Failures that prevent operation (user sees error)
- **warn:** Problems that don't prevent operation (degraded state)
- **info:** Important user-visible events (default level)
- **debug:** Detailed information for troubleshooting (--debug flag)

### Examples

```typescript
// ERROR: Operation failed
logger.error('Failed to send email', {
  error: error.message,
  recipient: options.to,
  retries: 3,
});

// WARN: Problem but continuing
logger.warn('Attachment size exceeds recommended limit', {
  size: attachmentSize,
  limit: MAX_SIZE,
  filename: attachment.name,
});

// INFO: User-visible progress
logger.info('Email sent successfully', {
  messageId: result.id,
  recipient: options.to,
});

// DEBUG: Detailed diagnostics
logger.debug('HTTP request completed', {
  method: 'POST',
  url: apiUrl,
  statusCode: response.status,
  duration: responseTime,
});
```

---

## Log File Structure

```
~/.mailgoat/logs/
├── combined.log       # All logs (info, warn, error, debug)
├── error.log          # Only errors
├── combined.log.1     # Rotated logs
├── combined.log.2
└── error.log.1
```

**Retention:** Last 5 files, 5MB each = max 25MB per type

---

## Alternatives Considered

### Alternative 1: Pino

**Description:** Fast, low-overhead logging library

**Pros:**

- Faster than Winston (benchmarks show 2-3x)
- Smaller bundle size (~30KB)
- Good TypeScript support
- Structured logging by default

**Cons:**

- Less popular than Winston (fewer resources)
- JSON-only output (need separate tool for pretty printing)
- Fewer built-in transports
- More complex configuration

**Why rejected:** Winston is more established and has better ecosystem support. Performance difference not critical for CLI tool.

### Alternative 2: Bunyan

**Description:** JSON logging library similar to Pino

**Pros:**

- Structured JSON logging
- Good CLI tool for viewing logs
- Decent performance

**Cons:**

- Less actively maintained
- Smaller community
- TypeScript support not as good
- Fewer features than Winston

**Why rejected:** Winston is more actively maintained and has better TypeScript support.

### Alternative 3: Custom Logger

**Description:** Build our own simple logger

**Pros:**

- No external dependency
- Exactly what we need
- Small bundle impact

**Cons:**

- Time to build and test
- Missing features (rotation, transports)
- Maintenance burden
- Likely bugs

**Why rejected:** Winston provides all features we need with proven reliability.

### Alternative 4: Debug Module

**Description:** Simple debug logging (used by many libraries)

**Pros:**

- Very lightweight (~1KB)
- Simple to use
- Namespace-based filtering

**Cons:**

- Debug only (no info/warn/error levels)
- No file logging
- No structured logging
- Not suitable for production

**Why rejected:** Too limited for our needs, doesn't solve production logging requirement.

---

## Related Decisions

- ADR-001: Dependency Injection (logger injected via DI)
- Future: ADR-00X: Observability Strategy (logging is foundation)

---

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Logging Best Practices](https://12factor.net/logs)
- [Structured Logging](https://www.honeycomb.io/blog/structured-logging-and-your-team)

---

## Migration Strategy

### Step 1: Add Winston

```bash
npm install winston
```

### Step 2: Create Logger Module

```typescript
// src/infrastructure/logger.ts
export const logger = createLogger();
```

### Step 3: Replace console.log Gradually

- Start with high-traffic code paths
- Commands first, then lib
- Update tests to capture logs

### Step 4: Document Usage

- Add logging guide to CONTRIBUTING.md
- Examples for each log level
- When to log what

---

## Testing

### Test Log Output

```typescript
import { logger } from '../infrastructure/logger';

// Capture logs in tests
const logs: string[] = [];
logger.add(
  new winston.transports.Stream({
    stream: {
      write: (message: string) => logs.push(message),
    },
  })
);

// Run code that logs
await sendEmail(options);

// Assert logs
expect(logs).toContain('Email sent successfully');
```

---

## Notes

**Current Status:**

- ⚠️ Only console.log in use
- ❌ No structured logging
- ❌ No production log files
- ❌ No debug mode

**After Implementation:**

- ✅ Winston integrated
- ✅ Structured logs with metadata
- ✅ Logs to files in ~/.mailgoat/logs/
- ✅ --debug flag for detailed logs
- ✅ --silent flag for JSON mode

**Performance Impact:** Negligible for CLI tool (async logging)

**Bundle Size Impact:** +60KB (Winston) - acceptable for production tool

---

**Decision made by:** @lead-engineer  
**Implementation:** @developer-2  
**Last Updated:** 2026-02-18
