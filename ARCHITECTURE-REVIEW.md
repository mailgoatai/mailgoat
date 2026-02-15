# MailGoat Architecture Review & Improvements

**Lead Engineer:** @lead-engineer  
**Date:** 2026-02-15  
**Current LOC:** 1,530 TypeScript (CLI), 7,141 total files  
**Status:** MVP functional, needs scalability and maintainability improvements

---

## Current State Assessment

### ✅ What's Working Well

- **Clean separation of concerns** - Commands, lib, types
- **Type safety** - TypeScript with strict mode
- **Input validation** - Comprehensive validators module
- **Error handling** - Retry logic, categorized errors
- **Testing started** - Jest configured, some tests
- **Good documentation** - README, guides, examples

### ⚠️ Architecture Concerns

#### 1. **No Dependency Injection**

- PostalClient directly instantiated in commands
- Hard to test, hard to mock
- Tight coupling to Postal implementation

#### 2. **No Service Layer**

- Business logic mixed with CLI commands
- Commands are too fat (>100 lines each)
- Difficult to reuse logic in other contexts (SDK, API)

#### 3. **No Interface Abstractions**

- PostalClient is concrete class, not interface
- Can't swap providers easily
- Testing requires mocking axios, not service

#### 4. **Configuration Management**

- Single YAML file, no profiles properly implemented
- No environment variable overrides
- No secrets management integration

#### 5. **No Logging Framework**

- console.log/error scattered everywhere
- No structured logging
- No log levels
- Can't troubleshoot production issues

#### 6. **No Metrics/Telemetry**

- No visibility into usage
- Can't track errors
- No performance monitoring

#### 7. **No Cache Layer**

- Every `config show` reads file
- No message caching for inbox
- Inefficient for repeated operations

#### 8. **Synchronous File I/O**

- Blocks event loop
- Config reading not async
- Attachment reading could be parallel

#### 9. **No Request Queue**

- Multiple simultaneous sends could overwhelm Postal
- No rate limiting beyond retry logic
- No request deduplication

#### 10. **No Plugin System**

- Can't extend functionality
- Hard-coded Postal integration
- No way to add custom commands

---

## Recommended Architecture (Phase 2)

```
┌─────────────────────────────────────────────────────┐
│                   CLI Layer                         │
│  (commander, argument parsing, output formatting)   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                Service Layer                        │
│  (business logic, validation, orchestration)       │
│  - EmailService                                    │
│  - ConfigService                                   │
│  - ValidationService                               │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                Provider Layer                       │
│  (mail provider abstraction)                       │
│  - IMailProvider interface                         │
│  - PostalProvider implements IMailProvider         │
│  - Future: SendGridProvider, SMTPProvider          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Infrastructure Layer                   │
│  (config, cache, logging, telemetry)              │
│  - ConfigManager                                   │
│  - CacheManager (Redis/in-memory)                 │
│  - Logger (Winston/Pino)                          │
│  - Telemetry (OpenTelemetry)                      │
└─────────────────────────────────────────────────────┘
```

---

## Scalability Improvements Needed

### 1. **Async/Await Throughout**

- All file I/O should be async
- Parallel processing where possible
- Non-blocking operations

### 2. **Connection Pooling**

- HTTP client connection reuse
- Postal API connection pool
- Configurable pool size

### 3. **Request Batching**

- Batch multiple sends into one API call
- Reduce network overhead
- Improve throughput

### 4. **Message Queue Integration**

- Queue outbound emails for reliability
- Retry failed sends automatically
- Decouple CLI from Postal availability

### 5. **Caching Strategy**

- Cache config in memory
- Cache Postal message metadata
- Configurable TTL
- Cache invalidation strategy

### 6. **Rate Limiting**

- Respect Postal rate limits
- Client-side rate limiting
- Exponential backoff
- Queue overflow handling

### 7. **Horizontal Scalability**

- Stateless design (already good)
- Shared config via env vars or remote config
- Distributed rate limiting (Redis)

---

## Maintainability Improvements

### 1. **Code Organization**

```
src/
├── commands/          # CLI commands (thin)
├── services/          # Business logic
├── providers/         # Mail provider implementations
├── infrastructure/    # Config, cache, logging
├── types/            # TypeScript interfaces
├── utils/            # Helpers, validators
└── plugins/          # Plugin system (future)
```

### 2. **Dependency Injection**

```typescript
// Instead of:
const client = new PostalClient(config);

// Do:
const container = new DependencyContainer();
container.register<IMailProvider>('mailProvider', PostalProvider);
const mailService = container.resolve<EmailService>('emailService');
```

### 3. **Interface-Driven Design**

```typescript
// Define interfaces
interface IMailProvider {
  sendEmail(message: EmailMessage): Promise<SendResult>;
  receiveEmails(options: ReceiveOptions): Promise<Email[]>;
}

// Multiple implementations
class PostalProvider implements IMailProvider {}
class SendGridProvider implements IMailProvider {}
class SMTPProvider implements IMailProvider {}
```

### 4. **Configuration Management**

```typescript
// Hierarchical config
1. Defaults (code)
2. Config file (~/.mailgoat/config.yml)
3. Environment variables (MAILGOAT_*)
4. Command-line flags

// Profiles
~/.mailgoat/profiles/
  ├── default.yml
  ├── production.yml
  └── staging.yml
```

### 5. **Structured Logging**

```typescript
// Instead of:
console.log('Sending email...');

// Do:
logger.info('email.send', {
  to: recipients,
  messageId: uuid,
  timestamp: Date.now(),
});
```

---

## Security Improvements

### 1. **Secrets Management**

- Integrate with system keychain (keytar)
- Encrypted config storage
- Never log API keys
- Secure memory handling

### 2. **Input Sanitization**

- Already have validators ✓
- Add output encoding
- Prevent header injection
- Path traversal checks

### 3. **TLS/SSL Enforcement**

- Enforce HTTPS for Postal
- Certificate validation
- No plain HTTP fallback

### 4. **Audit Logging**

- Log all send operations
- Track config changes
- Monitor failed auth attempts

---

## Testing Improvements

### 1. **Unit Test Coverage**

- Target: >80%
- All services fully tested
- Mock all external dependencies

### 2. **Integration Tests**

- Test against mock Postal server
- Docker-based Postal for CI
- End-to-end command tests

### 3. **E2E Tests**

- Full CLI workflow tests
- Config → Send → Read → Verify
- Multiple scenarios

### 4. **Performance Tests**

- Benchmark send throughput
- Memory usage profiling
- Load testing
- Concurrency testing

### 5. **Property-Based Testing**

- Fast-check for validators
- Generate random valid/invalid inputs
- Find edge cases

---

## Feature Completeness

### Missing MVP Features

1. ~~Attachment support~~ ✓ (done by Dev 1)
2. ~~Config init~~ ✓ (done by Dev 1)
3. **Inbox listing** (Postal limitation, workarounds needed)
4. **Message search** (filter by sender, subject, date)
5. **Message deletion** (remove old emails)
6. **Message threading** (reply-to tracking)

### Phase 2 Features

1. **Templates** (reusable email templates)
2. **Scheduled sends** (cron integration)
3. **Webhooks** (receive via webhook, not polling)
4. **Aliases** (multiple from addresses)
5. **Signatures** (email signatures)
6. **Attachments in inbox** (download received files)

---

## Performance Optimization

### 1. **Lazy Loading**

- Don't load all dependencies on startup
- Dynamic imports for commands
- Reduce CLI boot time

### 2. **Binary Compilation**

- pkg or nexe for standalone binary
- No Node.js dependency
- Faster startup

### 3. **Streaming**

- Stream large attachments
- Don't load entire file in memory
- Chunked transfer encoding

### 4. **Parallel Operations**

- Send to multiple recipients in parallel
- Batch attachment encoding
- Concurrent inbox fetches

---

## Documentation Gaps

1. **API Documentation** (TSDoc comments)
2. **Architecture Decision Records** (ADRs)
3. **Contribution Guide** (how to add providers)
4. **Plugin Development Guide**
5. **Performance Tuning Guide**
6. **Troubleshooting Runbook**

---

## Priority Matrix

### P0 (Blocking Scalability)

- Service layer extraction
- Dependency injection
- Async file I/O
- Structured logging

### P1 (Important)

- Interface abstractions
- Configuration profiles
- Connection pooling
- Test coverage >80%

### P2 (Nice to Have)

- Plugin system
- Message queue
- Metrics/telemetry
- Binary compilation

---

## Next Steps

1. **Create detailed tasks** for each improvement
2. **Assign priorities** (P0 → P1 → P2)
3. **Break into 2-4 hour chunks** for AI developers
4. **Define success criteria** for each task
5. **Create integration plan** (how changes fit together)
