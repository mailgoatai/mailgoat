# MailGoat Coding Standards

**Version:** 1.0  
**Last Updated:** 2026-02-18  
**Status:** APPROVED

---

## Introduction

These standards ensure consistency across the MailGoat codebase, especially important with multiple AI agents contributing simultaneously.

**Core Principles:**

1. **Consistency over perfection** - Follow patterns, even if not perfect
2. **Clarity over cleverness** - Readable code beats clever code
3. **Test everything** - Code without tests is legacy code
4. **Document decisions** - Future you (and other agents) will thank you

---

## TypeScript Standards

### Type Safety

**Rule:** Use TypeScript strict mode, no `any` types

```typescript
// ❌ BAD
function send(data: any) { ... }

// ✅ GOOD
interface SendOptions {
  to: string[];
  subject: string;
  body: string;
}
function send(options: SendOptions) { ... }
```

**Rule:** Explicit return types on public functions

```typescript
// ❌ BAD
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ GOOD
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Rule:** Use interfaces for public APIs, types for internal

```typescript
// ✅ Public API
export interface IMailProvider {
  sendEmail(options: SendOptions): Promise<SendResult>;
}

// ✅ Internal type
type ConfigOptions = {
  apiKey: string;
  baseUrl: string;
};
```

### Naming Conventions

| Type        | Convention                           | Example            |
| ----------- | ------------------------------------ | ------------------ |
| Interfaces  | PascalCase, `I` prefix for contracts | `IMailProvider`    |
| Classes     | PascalCase                           | `PostalProvider`   |
| Functions   | camelCase                            | `sendEmail()`      |
| Variables   | camelCase                            | `emailAddress`     |
| Constants   | UPPER_SNAKE_CASE                     | `MAX_RETRIES`      |
| Files       | kebab-case                           | `mail-provider.ts` |
| Directories | kebab-case                           | `mail-providers/`  |

**Interfaces vs Types:**

- Use `interface` for public contracts (can be extended)
- Use `type` for internal shapes, unions, utilities

### File Organization

```typescript
// Order of contents:
// 1. Imports (grouped by type)
// 2. Constants
// 3. Types/Interfaces
// 4. Implementation

// External dependencies
import { injectable, inject } from 'tsyringe';
import axios from 'axios';

// Internal dependencies
import { IMailProvider } from './mail-provider.interface';
import { logger } from '../infrastructure/logger';

// Constants
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

// Types
interface ProviderConfig {
  apiUrl: string;
  apiKey: string;
}

// Implementation
@injectable()
export class PostalProvider implements IMailProvider {
  // ...
}
```

---

## Dependency Injection

**Rule:** All services must use DI container

```typescript
// ✅ GOOD - Use DI
import { container } from '../container';
const emailService = container.resolve<IEmailService>('emailService');

// ❌ BAD - Direct instantiation
import { EmailService } from '../services/email-service';
const emailService = new EmailService(config);
```

**Rule:** Inject interfaces, not concrete classes

```typescript
// ✅ GOOD
constructor(
  @inject('mailProvider') private mailProvider: IMailProvider
) {}

// ❌ BAD
constructor(
  private postalClient: PostalClient  // Concrete class
) {}
```

**Rule:** Register in container.ts, not inline

```typescript
// ✅ GOOD - container.ts
container.register<IMailProvider>('mailProvider', {
  useClass: PostalProvider,
});

// ❌ BAD - Inline registration
container.register('mailProvider', { useClass: PostalProvider });
```

---

## Service Layer

### Responsibilities

**Commands:** Thin wrappers (< 50 lines)

- Parse CLI arguments
- Validate input
- Call service
- Format output
- Handle errors

**Services:** Business logic

- Core functionality
- Data transformation
- Provider interaction
- Error handling
- Logging

**Providers:** External integration

- API calls
- Protocol implementation
- Provider-specific logic
- Response mapping

### Service Structure

```typescript
@injectable()
export class EmailService {
  constructor(
    @inject('mailProvider') private mailProvider: IMailProvider,
    @inject('configService') private configService: IConfigService,
    @inject('logger') private logger: ILogger
  ) {}

  async sendEmail(options: SendOptions): Promise<SendResult> {
    // 1. Validate
    this.validateOptions(options);

    // 2. Transform
    const message = this.buildMessage(options);

    // 3. Log
    this.logger.info('Sending email', { to: options.to });

    // 4. Execute
    try {
      const result = await this.mailProvider.sendEmail(message);
      this.logger.info('Email sent', { id: result.id });
      return result;
    } catch (error) {
      this.logger.error('Send failed', { error });
      throw new EmailSendError('Failed to send email', { cause: error });
    }
  }

  private validateOptions(options: SendOptions): void {
    // Validation logic
  }

  private buildMessage(options: SendOptions): EmailMessage {
    // Transform logic
  }
}
```

---

## Error Handling

### Custom Errors

**Rule:** Use custom error classes for domain errors

```typescript
// ✅ GOOD - Custom errors
export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly details: { recipient?: string; cause?: Error }
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

throw new EmailSendError('Failed to send', {
  recipient: options.to,
  cause: apiError,
});
```

**Rule:** Always include context in errors

```typescript
// ❌ BAD
throw new Error('Send failed');

// ✅ GOOD
throw new EmailSendError('Failed to send email', {
  recipient: options.to,
  statusCode: response.status,
  cause: error,
});
```

### Error Handling Pattern

```typescript
async function operation() {
  try {
    // Try operation
    const result = await riskyOperation();
    return result;
  } catch (error) {
    // Log with context
    logger.error('Operation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        /* relevant data */
      },
    });

    // Rethrow or wrap
    if (error instanceof KnownError) {
      throw error; // Rethrow domain errors
    }
    throw new OperationError('Operation failed', { cause: error });
  }
}
```

---

## Logging

### Log Levels

- **error:** Operation failures
- **warn:** Degraded state
- **info:** User-visible events
- **debug:** Detailed diagnostics (--debug flag)

### Logging Pattern

```typescript
// ✅ GOOD - Structured logging
logger.info('Email sent', {
  messageId: result.id,
  recipient: options.to,
  size: body.length,
  duration: Date.now() - startTime,
});

// ❌ BAD - Unstructured
console.log(`Email sent to ${options.to} with ID ${result.id}`);
```

**Rule:** Never log sensitive data

```typescript
// ❌ BAD - Logs API key
logger.debug('Request', { headers: config.headers });

// ✅ GOOD - Redact sensitive data
logger.debug('Request', {
  headers: { ...config.headers, 'X-API-Key': '[REDACTED]' },
});
```

**Rule:** Always include context

```typescript
// ❌ BAD
logger.error('Failed');

// ✅ GOOD
logger.error('Failed to send email', {
  error: error.message,
  recipient: options.to,
  retryCount: retries,
});
```

---

## Testing

### Test Coverage

**Requirements:**

- Minimum 80% coverage for new code
- All services must have unit tests
- All commands must have integration tests
- Critical paths must have E2E tests

### Test Structure

```typescript
describe('EmailService', () => {
  let emailService: EmailService;
  let mockProvider: jest.Mocked<IMailProvider>;

  beforeEach(() => {
    // Setup mocks
    mockProvider = {
      sendEmail: jest.fn(),
    };

    // Create service with mocks
    container.register('mailProvider', { useValue: mockProvider });
    emailService = container.resolve(EmailService);
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      // Arrange
      const options: SendOptions = {
        to: ['test@example.com'],
        subject: 'Test',
        body: 'Body',
      };
      mockProvider.sendEmail.mockResolvedValue({ id: '123' });

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.id).toBe('123');
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: options.to,
          subject: options.subject,
        })
      );
    });

    it('should throw EmailSendError on provider failure', async () => {
      // Arrange
      mockProvider.sendEmail.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(emailService.sendEmail(options)).rejects.toThrow(EmailSendError);
    });
  });
});
```

### Test Naming

```typescript
// Pattern: should [expected behavior] when [condition]
it('should return empty array when no emails match filter', () => {});
it('should retry 3 times when API returns 429', () => {});
it('should throw InvalidEmailError when email format is invalid', () => {});
```

### What to Test

**Unit Tests (Services):**

- Happy path
- Error cases
- Edge cases
- Validation logic

**Integration Tests (Commands):**

- Command parsing
- Service interaction
- Output formatting
- Error messages

**E2E Tests:**

- Full workflows
- Config → Send → Read
- Real file system
- Real (mock) API calls

---

## Documentation

### TSDoc Comments

**Rule:** All public APIs must have TSDoc comments

````typescript
/**
 * Sends an email via the configured mail provider
 *
 * @param options - Email sending options
 * @param options.to - Recipient email addresses
 * @param options.subject - Email subject line
 * @param options.body - Email body content (plain text or HTML)
 * @returns Promise resolving to send result with message ID
 * @throws {InvalidEmailError} If any email address format is invalid
 * @throws {EmailSendError} If provider API call fails after retries
 *
 * @example
 * ```typescript
 * const result = await emailService.sendEmail({
 *   to: ['user@example.com'],
 *   subject: 'Welcome',
 *   body: 'Hello!',
 * });
 * console.log(`Sent: ${result.id}`);
 * ```
 */
async sendEmail(options: SendOptions): Promise<SendResult>
````

### Inline Comments

**Rule:** Explain WHY, not WHAT

```typescript
// ❌ BAD - Obvious
// Loop through recipients
recipients.forEach(recipient => { ... });

// ✅ GOOD - Explains reasoning
// Batch recipients to avoid rate limits (max 50 per request)
for (let i = 0; i < recipients.length; i += 50) {
  const batch = recipients.slice(i, i + 50);
  await sendBatch(batch);
}
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] All tests pass (`npm test`)
- [ ] Test coverage added for new code
- [ ] TSDoc comments on public APIs
- [ ] No `console.log` (use logger)
- [ ] No `any` types
- [ ] DI used for dependencies
- [ ] Error handling with context
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Updated CHANGELOG.md if user-facing

### Reviewer Checklist

- [ ] Code follows patterns in this document
- [ ] Tests are meaningful (not just coverage)
- [ ] Error messages are helpful
- [ ] Logging includes context
- [ ] No security issues (API keys, etc.)
- [ ] Performance is acceptable
- [ ] Documentation is clear

---

## Git Workflow

### Branch Naming

```
feat/add-sendgrid-provider
fix/config-validation-error
docs/update-api-docs
refactor/extract-email-service
test/add-postal-client-tests
chore/update-dependencies
```

### Commit Messages

**Format:** `type(scope): message`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```
feat(send): add support for CC and BCC recipients
fix(config): validate email address format
docs(api): add TSDoc comments to EmailService
refactor(commands): migrate send command to use DI
test(postal): add integration tests for PostalProvider
```

### PR Description Template

```markdown
## Description

[What does this PR do?]

## Changes

- Changed X to Y
- Added feature Z
- Fixed bug in W

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation

- [ ] TSDoc comments added
- [ ] README updated (if needed)
- [ ] CHANGELOG updated (if user-facing)

## Related Issues

Closes #123
```

---

## Performance Guidelines

### Async Operations

**Rule:** Use `Promise.all()` for parallel operations

```typescript
// ❌ BAD - Sequential
for (const recipient of recipients) {
  await sendEmail(recipient); // Slow!
}

// ✅ GOOD - Parallel
await Promise.all(recipients.map((recipient) => sendEmail(recipient)));
```

### File I/O

**Rule:** All file operations must be async

```typescript
// ❌ BAD - Blocking
const config = fs.readFileSync(configPath, 'utf8');

// ✅ GOOD - Non-blocking
const config = await fs.promises.readFile(configPath, 'utf8');
```

### Large Data

**Rule:** Stream large files, don't load in memory

```typescript
// ✅ GOOD - Streaming
const stream = fs.createReadStream(largefile);
stream.pipe(processData()).pipe(output);
```

---

## Security Guidelines

### Secrets

**Rule:** Never log API keys or secrets

```typescript
// ❌ BAD
logger.debug('Config loaded', { config }); // Contains API key!

// ✅ GOOD
logger.debug('Config loaded', {
  apiUrl: config.apiUrl,
  // API key omitted
});
```

### Input Validation

**Rule:** Validate all user input

```typescript
// ✅ GOOD
function validateEmail(email: string): void {
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new InvalidEmailError('Invalid email format', { email });
  }
}
```

### Dependencies

**Rule:** Audit dependencies regularly

```bash
npm audit
npm audit fix
```

---

## When to Deviate

These are guidelines, not laws. Deviate when there's a good reason:

1. **Document why** - Comment explaining deviation
2. **Discuss in PR** - Get team buy-in
3. **Create ADR** - If it affects architecture
4. **Update standards** - If pattern should change

**Example:**

```typescript
// Using 'any' here because third-party library has incorrect types
// TODO: Submit PR to @types/library with correct types
const result: any = await thirdPartyCall();
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Clean Code in TypeScript](https://github.com/labs42io/clean-code-typescript)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TSDoc Reference](https://tsdoc.org/)

---

**Enforcement:** These standards are enforced via:

1. ESLint rules
2. Code review checklist
3. CI checks
4. Team accountability

**Updates:** This document will be updated as we learn. Propose changes via PR.

---

**Version:** 1.0  
**Last Updated:** 2026-02-18  
**Next Review:** After V1 launch
