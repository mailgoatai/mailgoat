# Logging Guide

Structured logging with Winston for MailGoat.

## Overview

MailGoat uses Winston for structured, leveled logging with:
- **File rotation** - Automatic log rotation (10MB per file)
- **Multiple transports** - Console (dev) + files (always)
- **Structured data** - JSON format with metadata
- **Log levels** - error, warn, info, debug
- **Environment control** - LOG_LEVEL and LOG_CONSOLE env vars

## Quick Start

### Basic Usage

```typescript
import { logger } from './infrastructure/logger';

// Simple log
logger.info('User logged in', { userId: 123, email: 'user@example.com' });

// Error with stack
logger.error('Failed to send email', {
  error: err.message,
  to: 'user@example.com',
});

// Debug information
logger.debug('Cache hit', { key: 'config:default', ttl: 300 });

// Warning
logger.warn('Rate limit approaching', { current: 95, limit: 100 });
```

### Convenience Methods

```typescript
import {
  logger,
  logError,
  logOperationStart,
  logOperationSuccess,
  logOperationFailure,
  createTimer,
} from './infrastructure/logger';

// Measure operation duration
const timer = createTimer();
logOperationStart('email.send', { to: 'user@example.com' });

try {
  await sendEmail();
  logOperationSuccess('email.send', timer(), { messageId: 'msg_123' });
} catch (error) {
  logOperationFailure('email.send', error, timer());
}

// Log errors with full context
try {
  await operation();
} catch (error) {
  logError('Operation failed', error, { userId: 123, operation: 'updateProfile' });
}
```

## Log Levels

**Hierarchy (most to least severe):**
1. `error` - Errors and exceptions
2. `warn` - Warning conditions
3. `info` - Informational messages (default)
4. `debug` - Detailed debug information

**Setting log level:**

```bash
# Environment variable
export LOG_LEVEL=debug
export MAILGOAT_LOG_LEVEL=debug  # Alternative

# Application will log debug and above
mailgoat send --to user@example.com
```

## Configuration

### Environment Variables

- `LOG_LEVEL` or `MAILGOAT_LOG_LEVEL` - Minimum log level (default: `info`)
- `LOG_CONSOLE` or `MAILGOAT_LOG_CONSOLE` - Force console output in production (`true`/`false`)
- `NODE_ENV` - Automatically enables console in non-production

### Log Files

Default location: `~/.mailgoat/logs/`

**Files:**
- `error.log` - Only error-level logs
- `combined.log` - All log levels

**Rotation:**
- Max size: 10MB per file
- Max files: 5 (error.log), 10 (combined.log)
- Automatic rotation when size exceeded

### Console Output

**Development (default):**
```
12:34:56 info: email.send {"to":"user@example.com","subject":"Hello"}
```

**Production:**
- Console disabled by default
- Enable with `LOG_CONSOLE=true`

## Log Structure

### File Format (JSON)

```json
{
  "level": "info",
  "message": "email.send",
  "timestamp": "2024-01-15T12:34:56.789Z",
  "service": "mailgoat",
  "version": "0.1.0",
  "to": "user@example.com",
  "subject": "Hello World",
  "messageId": "msg_abc123"
}
```

### Error Format

```json
{
  "level": "error",
  "message": "email.send.failure",
  "timestamp": "2024-01-15T12:34:56.789Z",
  "service": "mailgoat",
  "error": {
    "message": "Connection timeout",
    "name": "TimeoutError",
    "stack": "Error: Connection timeout\n    at..."
  },
  "to": "user@example.com",
  "duration_ms": 5000
}
```

## Best Practices

### 1. Use Structured Data

```typescript
// ❌ Bad - string concatenation
logger.info(`User ${userId} sent email to ${to}`);

// ✅ Good - structured fields
logger.info('email.send', { userId, to });
```

### 2. Use Consistent Event Names

```typescript
// Good naming pattern: <resource>.<action>[.<result>]
logger.info('email.send');
logger.info('email.send.success');
logger.error('email.send.failure');

logger.info('config.load');
logger.info('config.save');
logger.info('config.change', { operation: 'update_profile' });

logger.debug('cache.hit', { key: 'config:default' });
logger.debug('cache.miss', { key: 'config:staging' });
```

### 3. Include Context

```typescript
// Include relevant context for troubleshooting
logger.info('email.send', {
  to: recipients,
  subject,
  from: config.email,
  profile: config.profile,
  messageId: response.message_id,
});
```

### 4. Use Appropriate Levels

```typescript
// Error - Something failed
logger.error('database.connection.failure', { error: err.message });

// Warn - Unusual but not critical
logger.warn('rate_limit.approaching', { current: 95, limit: 100 });

// Info - Normal operations
logger.info('email.sent', { to: 'user@example.com' });

// Debug - Detailed debugging
logger.debug('cache.lookup', { key: 'config:default', found: true });
```

### 5. Log Operation Lifecycle

```typescript
const timer = createTimer();

// Start
logOperationStart('email.send', { to: recipients });

try {
  const result = await sendEmail(recipients);
  
  // Success
  logOperationSuccess('email.send', timer(), {
    messageId: result.message_id,
    recipientCount: recipients.length,
  });
} catch (error) {
  // Failure
  logOperationFailure('email.send', error, timer(), {
    to: recipients,
  });
  throw error;
}
```

### 6. Don't Log Sensitive Data

```typescript
// ❌ Bad - logging passwords, API keys
logger.info('auth.login', {
  email: 'user@example.com',
  password: userPassword,  // NEVER DO THIS
  apiKey: config.api_key,  // NEVER DO THIS
});

// ✅ Good - sanitize sensitive data
logger.info('auth.login', {
  email: 'user@example.com',
  // Don't log password at all
});

logger.debug('config.loaded', {
  server: config.server,
  email: config.email,
  apiKey: config.api_key.substring(0, 8) + '...',  // Partial only
});
```

## Migration from console.log

### Before (console.log)

```typescript
console.log('Sending email to', to);
console.error('Failed to send:', err);
console.log('Config loaded from', configPath);
```

### After (Winston)

```typescript
logger.info('email.send', { to });
logger.error('email.send.failure', { error: err.message, to });
logger.debug('config.loaded', { path: configPath });
```

### Before (debugLogger)

```typescript
import { debugLogger } from './lib/debug';

debugLogger.log('api', 'Making request');
debugLogger.logError('api', error);
```

### After (Winston)

```typescript
import { logger } from './infrastructure/logger';

logger.debug('api.request', { method: 'POST', url });
logger.error('api.request.failure', { error: error.message, url });
```

## Convenience Methods Reference

### `logError(message, error, meta?)`

Log an error with full context and stack trace.

```typescript
try {
  await riskyOperation();
} catch (error) {
  logError('Operation failed', error, { userId: 123, operation: 'updateProfile' });
}
```

### `logOperationStart(operation, meta?)`

Log the start of an operation.

```typescript
logOperationStart('email.send', { to: 'user@example.com', subject: 'Hello' });
```

### `logOperationSuccess(operation, duration?, meta?)`

Log successful completion.

```typescript
const timer = createTimer();
// ... do work ...
logOperationSuccess('email.send', timer(), { messageId: 'msg_123' });
```

### `logOperationFailure(operation, error, duration?, meta?)`

Log operation failure.

```typescript
const timer = createTimer();
try {
  // ... do work ...
} catch (error) {
  logOperationFailure('email.send', error, timer(), { to: 'user@example.com' });
}
```

### `createTimer()`

Create a duration timer.

```typescript
const timer = createTimer();
await operation();
const duration = timer(); // Returns milliseconds
logger.info('operation.complete', { duration_ms: duration });
```

### `logApiRequest(method, url, meta?)`

Log HTTP API request.

```typescript
logApiRequest('POST', 'https://api.example.com/send', { body: requestBody });
```

### `logApiResponse(method, url, status, duration, meta?)`

Log HTTP API response.

```typescript
logApiResponse('POST', 'https://api.example.com/send', 200, 1234, { messageId: 'msg_123' });
```

### `logEmailEvent(event, meta?)`

Log email-related events.

```typescript
logEmailEvent('send', { to: 'user@example.com', subject: 'Hello' });
logEmailEvent('receive', { from: 'sender@example.com', messageId: 'msg_123' });
```

### `logConfigChange(operation, meta?)`

Log configuration changes.

```typescript
logConfigChange('profile.create', { profile: 'staging' });
logConfigChange('profile.delete', { profile: 'old-env' });
```

### `logValidationError(field, error, meta?)`

Log validation failures.

```typescript
logValidationError('email', 'Invalid email format', { value: 'not-an-email' });
```

### `logCacheEvent(event, key, meta?)`

Log cache operations.

```typescript
logCacheEvent('hit', 'config:default', { ttl: 300 });
logCacheEvent('miss', 'config:staging');
logCacheEvent('invalidate', 'config:default');
```

## Log Analysis

### View Logs

```bash
# View all logs
tail -f ~/.mailgoat/logs/combined.log

# View only errors
tail -f ~/.mailgoat/logs/error.log

# Search for specific events
grep "email.send" ~/.mailgoat/logs/combined.log

# Pretty-print JSON logs
tail -f ~/.mailgoat/logs/combined.log | jq '.'
```

### Filter by Level

```bash
# Only errors
grep '"level":"error"' ~/.mailgoat/logs/combined.log | jq '.'

# Only warnings and errors
grep -E '"level":"(error|warn)"' ~/.mailgoat/logs/combined.log | jq '.'
```

### Filter by Event

```bash
# All email events
grep '"message":"email\.' ~/.mailgoat/logs/combined.log | jq '.'

# Specific event
grep '"message":"email.send"' ~/.mailgoat/logs/combined.log | jq '.'

# Failed operations
grep '\.failure"' ~/.mailgoat/logs/combined.log | jq '.'
```

### Analyze Performance

```bash
# Find slow operations (>1000ms)
grep '"duration_ms"' ~/.mailgoat/logs/combined.log | \
  jq 'select(.duration_ms > 1000)'

# Average duration for email.send
grep '"message":"email.send.success"' ~/.mailgoat/logs/combined.log | \
  jq -r '.duration_ms' | \
  awk '{sum+=$1; count++} END {print sum/count}'
```

## Troubleshooting

### Logs not appearing

**Check log level:**
```bash
# Ensure LOG_LEVEL is set appropriately
export LOG_LEVEL=debug
```

**Check log directory:**
```bash
# Verify logs directory exists and is writable
ls -la ~/.mailgoat/logs/
```

**Enable console output:**
```bash
# Force console output
export LOG_CONSOLE=true
```

### Log files growing too large

**Rotation is automatic** but you can manually clean:

```bash
# Remove old logs
rm ~/.mailgoat/logs/*.log.*

# Keep only recent logs
find ~/.mailgoat/logs/ -name "*.log.*" -mtime +7 -delete
```

### Performance issues

**Reduce log level in production:**
```bash
export LOG_LEVEL=warn
```

**Disable debug logs:**
```bash
# Only log warnings and errors
export LOG_LEVEL=warn
```

## Integration Examples

### PostalClient

```typescript
import { logger, logApiRequest, logApiResponse, createTimer } from '../infrastructure/logger';

async send(params: SendMessageParams) {
  const timer = createTimer();
  
  logApiRequest('POST', '/send/message', { to: params.to });
  
  try {
    const response = await this.client.post('/send/message', params);
    logApiResponse('POST', '/send/message', 200, timer(), {
      messageId: response.data.message_id,
    });
    return response.data;
  } catch (error) {
    logApiResponse('POST', '/send/message', error.response?.status || 500, timer());
    throw error;
  }
}
```

### ConfigService

```typescript
import { logger, logConfigChange } from '../infrastructure/logger';

save(config: MailGoatConfig, profileName?: string): void {
  logger.info('config.save', { profile: profileName || 'default' });
  
  // ... save logic ...
  
  logConfigChange('save', {
    profile: profileName || 'default',
    server: config.server,
  });
}
```

### ValidationService

```typescript
import { logValidationError } from '../infrastructure/logger';

validateEmail(email: string): ValidationResult {
  if (!this.isValidEmail(email)) {
    logValidationError('email', 'Invalid email format', { value: email });
    return { valid: false, error: 'Invalid email', field: 'email' };
  }
  return { valid: true };
}
```

## Related Documentation

- [Debug Guide](./debug.md)
- [Configuration](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
