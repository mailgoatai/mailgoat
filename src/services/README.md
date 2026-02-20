# Services Layer

Business logic layer for MailGoat. Services separate business operations from CLI commands and provide reusable functionality.

## Architecture

```
Commands (CLI)
    ↓ uses
Services (Business Logic)
    ↓ uses
Providers (Email APIs)
```

## Why Services?

### Problems Without Services

- Business logic mixed with CLI parsing
- Hard to test (CLI-coupled)
- Can't reuse logic in API/webhooks
- Validation scattered everywhere

### Benefits of Services

- ✅ **Separation of Concerns** - Business logic separated from UI
- ✅ **Reusability** - Same logic for CLI, API, webhooks
- ✅ **Testability** - Easy to unit test without CLI
- ✅ **Maintainability** - Single place for business rules
- ✅ **DI Ready** - Constructor injection for dependencies

## EmailService

Core service for email operations.

### Usage

```typescript
import { EmailService } from './services';
import { ProviderFactory } from './providers';

// Create provider
const provider = ProviderFactory.createFromConfig(config);

// Create service
const emailService = new EmailService(provider);

// Send email
const result = await emailService.sendEmail({
  to: ['user@example.com'],
  subject: 'Hello',
  body: 'Test message',
});

console.log(`Sent: ${result.messageId}`);

// Read email
const email = await emailService.readEmail(result.messageId);
console.log(`From: ${email.from}, Subject: ${email.subject}`);
```

### With Custom Logger

```typescript
import { EmailService, ConsoleLogger } from './services';

const logger = new ConsoleLogger('MyApp');
const emailService = new EmailService(provider, logger);
```

### With Null Logger (Testing)

```typescript
import { EmailService, NullLogger } from './services';

const emailService = new EmailService(provider, new NullLogger());
```

## Methods

### sendEmail(options)

Send an email message.

**Parameters:**
- `to: string[]` - Recipients (required)
- `subject: string` - Subject line (required)
- `body?: string` - Plain text body
- `html?: string` - HTML body
- `from?: string` - Sender email
- `cc?: string[]` - CC recipients
- `bcc?: string[]` - BCC recipients
- `replyTo?: string` - Reply-To address
- `tag?: string` - Message tag
- `headers?: Record<string, string>` - Custom headers
- `attachments?: EmailAttachment[]` - File attachments

**Returns:** `Promise<SendEmailResult>`

**Example:**
```typescript
const result = await emailService.sendEmail({
  to: ['alice@example.com', 'bob@example.com'],
  subject: 'Meeting Tomorrow',
  body: 'Don\'t forget our meeting at 3pm',
  cc: ['manager@example.com'],
  tag: 'meeting-reminder',
});
```

### readEmail(messageId, options?)

Read message details.

**Parameters:**
- `messageId: string` - Message identifier (required)
- `options?: ReadEmailOptions` - Read options
  - `includeBody?: boolean` - Include message body (default: true)
  - `includeAttachments?: boolean` - Include attachments
  - `includeHeaders?: boolean` - Include headers
  - `expansions?: string[]` - Provider-specific expansions

**Returns:** `Promise<Email>`

**Example:**
```typescript
const email = await emailService.readEmail('msg-123', {
  includeHeaders: true,
  includeAttachments: true,
});

console.log(`Subject: ${email.subject}`);
console.log(`From: ${email.from}`);
console.log(`Body: ${email.body}`);
```

### getDeliveries(messageId)

Get delivery information for a message.

**Parameters:**
- `messageId: string` - Message identifier

**Returns:** `Promise<any[]>`

**Example:**
```typescript
const deliveries = await emailService.getDeliveries('msg-123');
console.log(`Delivered to ${deliveries.length} recipients`);
```

### testConnection()

Test connection to mail provider.

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const connected = await emailService.testConnection();
console.log(connected ? 'Connected' : 'Not connected');
```

## Migrating Commands to Services

### Before (Command with Logic)

```typescript
// send.ts
cmd.action(async (options) => {
  // Validation
  if (!options.to || options.to.length === 0) {
    throw new Error('Recipients required');
  }

  // Config
  const config = await configManager.load();
  
  // Create client
  const client = new PostalClient(config);
  
  // Send
  const result = await client.sendMessage({
    to: options.to,
    subject: options.subject,
    plain_body: options.body,
  });
  
  // Output
  console.log(`Sent: ${result.message_id}`);
});
```

### After (Thin Command)

```typescript
// send.ts
cmd.action(async (options) => {
  // Create service
  const config = await configManager.load();
  const provider = ProviderFactory.createFromConfig(config);
  const service = new EmailService(provider);
  
  // Use service (handles validation, logging, errors)
  const result = await service.sendEmail({
    to: options.to,
    subject: options.subject,
    body: options.body,
  });
  
  // Output (formatting only)
  console.log(`Sent: ${result.messageId}`);
});
```

Benefits:
- ✅ Command is 50% shorter
- ✅ Business logic in service (testable)
- ✅ Validation in one place
- ✅ Logging in one place
- ✅ Error handling in one place

## Testing Services

Services are easy to unit test:

```typescript
import { EmailService, NullLogger } from './services';
import { MockProvider } from './providers/mock';

describe('EmailService', () => {
  it('should send email', async () => {
    // Mock provider
    const provider = new MockProvider();
    
    // Create service
    const service = new EmailService(provider, new NullLogger());
    
    // Test
    const result = await service.sendEmail({
      to: ['test@example.com'],
      subject: 'Test',
      body: 'Test message',
    });
    
    expect(result.messageId).toBeDefined();
  });
});
```

## Dependency Injection

Services are wired through TSyringe today:

```typescript
import { initializeCommandContext } from '../commands/di-context';
import { EmailService } from '../services/email-service';

const { container } = await initializeCommandContext();
const emailService = container.resolve(EmailService);
```

Container registration is centralized in `src/container.ts`.
For tests, use `configureTestContainer()` from `src/container.test.ts`.

## Adding New Services

1. Create service file: `src/services/[name]-service.ts`

2. Define interface and class:

```typescript
export interface MyServiceOptions {
  // ...
}

export class MyService {
  constructor(
    private dependency: SomeDependency,
    private logger?: ILogger
  ) {
    this.logger = logger || new ConsoleLogger('MyService');
  }

  async doSomething(options: MyServiceOptions): Promise<Result> {
    this.logger.debug('doSomething called', options);
    
    // Business logic here
    
    this.logger.info('doSomething completed');
    return result;
  }
}
```

3. Export from index:

```typescript
// src/services/index.ts
export { MyService, MyServiceOptions } from './my-service';
```

4. Use in commands:

```typescript
const service = new MyService(dependency);
const result = await service.doSomething(options);
```

## Best Practices

### Do ✅

- Use constructor injection for dependencies
- Validate inputs in service methods
- Log important operations
- Return normalized data types
- Handle errors gracefully
- Make methods async by default
- Keep services stateless when possible

### Don't ❌

- Mix UI logic in services
- Access global state
- Use console.log directly (use logger)
- Throw generic errors (be specific)
- Make services CLI-aware
- Depend on other services directly (use interfaces)

## Future Services

Planned services:

- **TemplateService** - Email template management
- **AttachmentService** - File handling and validation
- **ConfigService** - Configuration management
- **ValidationService** - Centralized validation (exists in lib/)
- **CacheService** - Caching operations

## See Also

- [IMailProvider](../providers/mail-provider.interface.ts) - Provider interface
- [EmailService](./email-service.ts) - Implementation
- [Logger Interface](./logger.interface.ts) - Logging
