# Dependency Injection with TSyringe

MailGoat uses [TSyringe](https://github.com/microsoft/tsyringe) for dependency injection, providing loose coupling and better testability.

## Why Dependency Injection?

### Problems Without DI

```typescript
// Hard to test - tightly coupled to concrete classes
class EmailCommand {
  async execute() {
    const config = await new ConfigManager().load();
    const provider = new PostalProvider(config);
    const service = new EmailService(provider);
    await service.sendEmail({...});
  }
}
```

### Benefits With DI

```typescript
// Easy to test - dependencies injected
@injectable()
class EmailCommand {
  constructor(
    @inject('EmailService') private emailService: EmailService
  ) {}

  async execute() {
    await this.emailService.sendEmail({...});
  }
}
```

**Advantages:**

- ✅ **Testable** - Mock dependencies easily
- ✅ **Flexible** - Swap implementations without code changes
- ✅ **Maintainable** - Clear dependency relationships
- ✅ **Reusable** - Services configured once, used everywhere

## Setup

### 1. Install Dependencies

```bash
npm install tsyringe reflect-metadata
```

### 2. Enable Decorators

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 3. Import reflect-metadata

At the entry point of your application:

```typescript
import 'reflect-metadata';
```

## Container Configuration

The DI container is configured in `src/container.ts`:

```typescript
import { container, configureContainer } from './container';

// Configure with config
await configManager.load();
configureContainer(config);

// Now all services are registered and ready
```

## Using Dependency Injection

### In Services

```typescript
import { injectable, inject } from 'tsyringe';

@injectable()
export class EmailService {
  constructor(
    @inject('IMailProvider') private provider: IMailProvider,
    @inject('ILogger') private logger: ILogger
  ) {}

  async sendEmail(options: SendEmailOptions) {
    // Implementation
  }
}
```

### In Commands

```typescript
import { container } from '../container';
import { EmailService } from '../services';

export function createSendCommand() {
  return new Command('send').action(async (options) => {
    // Resolve service from container
    const emailService = container.resolve(EmailService);

    // Use service
    const result = await emailService.sendEmail({
      to: options.to,
      subject: options.subject,
      body: options.body,
    });

    console.log(`Sent: ${result.messageId}`);
  });
}
```

### Manual Resolution

```typescript
import { container } from './container';

// Resolve by class
const emailService = container.resolve(EmailService);

// Resolve by token
const provider = container.resolve<IMailProvider>('IMailProvider');
const logger = container.resolve<ILogger>('ILogger');
```

## Registration Types

### 1. Class Registration

```typescript
container.register('ILogger', {
  useClass: ConsoleLogger,
});
```

### 2. Value Registration

```typescript
container.register('Config', {
  useValue: config,
});
```

### 3. Factory Registration

```typescript
container.register<IMailProvider>('IMailProvider', {
  useFactory: (c) => {
    const config = c.resolve<MailGoatConfig>('Config');
    return new PostalProvider(config);
  },
});
```

### 4. Token Registration

```typescript
// Register with token
container.register<EmailService>('EmailService', {
  useClass: EmailService,
});

// Resolve with token
const service = container.resolve<EmailService>('EmailService');
```

## Testing with DI

### Reset Container

```typescript
import { resetContainer } from './container';

beforeEach(() => {
  resetContainer();
});
```

### Register Test Doubles

```typescript
import { container } from './container';
import { NullLogger } from './services/logger.interface';

// Use silent logger
container.register('ILogger', {
  useClass: NullLogger,
});

// Mock provider
class MockMailProvider implements IMailProvider {
  async sendMessage() {
    return { message_id: 'test-123' };
  }
  async getMessage() {
    return { id: 1 } as any;
  }
}

container.register<IMailProvider>('IMailProvider', {
  useClass: MockMailProvider,
});
```

### Test Example

```typescript
describe('EmailService', () => {
  beforeEach(() => {
    resetContainer();

    // Configure test container
    container.register('ILogger', { useClass: NullLogger });
    container.register('IMailProvider', { useClass: MockMailProvider });
    container.register('ValidationService', { useValue: validationService });
  });

  it('should send email', async () => {
    const service = container.resolve(EmailService);

    const result = await service.sendEmail({
      to: ['test@example.com'],
      subject: 'Test',
      body: 'Test message',
    });

    expect(result.messageId).toBe('test-123');
  });
});
```

## Registered Services

Current services in the container:

| Token               | Type              | Lifecycle |
| ------------------- | ----------------- | --------- |
| `Config`            | MailGoatConfig    | Singleton |
| `ILogger`           | ConsoleLogger     | Singleton |
| `ValidationService` | ValidationService | Singleton |
| `IMailProvider`     | PostalProvider    | Singleton |
| `EmailService`      | EmailService      | Singleton |

## Lifecycle

TSyringe uses singleton scope by default - each token resolves to the same instance.

```typescript
const service1 = container.resolve(EmailService);
const service2 = container.resolve(EmailService);

console.log(service1 === service2); // true
```

## Best Practices

### Do ✅

- Use `@injectable()` on all service classes
- Use `@inject('Token')` for dependencies
- Register interfaces with tokens
- Keep registrations in `container.ts`
- Reset container in tests
- Use factories for complex initialization

### Don't ❌

- Mix DI and manual instantiation
- Forget `reflect-metadata` import
- Register services in multiple places
- Use concrete classes as tokens (use interface tokens)
- Couple to container implementation

## Migration from Manual Instantiation

### Before (Manual)

```typescript
const config = await configManager.load();
const provider = new PostalProvider(config);
const logger = new ConsoleLogger('App');
const service = new EmailService(provider, logger);
```

### After (DI)

```typescript
configureContainer(config);
const service = container.resolve(EmailService);
```

### Gradual Migration

Both patterns work simultaneously:

```typescript
// Old code (still works)
const provider = ProviderFactory.createFromConfig(config);
const service = new EmailService(provider);

// New code (with DI)
configureContainer(config);
const service = container.resolve(EmailService);
```

Migrate commands one at a time as needed.

## Common Patterns

### Lazy Resolution

```typescript
@injectable()
class MyService {
  // Don't resolve in constructor
  constructor(@inject('EmailService') private getEmailService: () => EmailService) {}

  async doSomething() {
    // Resolve when needed
    const emailService = this.getEmailService();
  }
}
```

### Optional Dependencies

```typescript
@injectable()
class MyService {
  constructor(
    @inject('EmailService') private emailService: EmailService,
    @inject('ILogger') private logger?: ILogger
  ) {
    this.logger = logger || new NullLogger();
  }
}
```

### Conditional Registration

```typescript
if (process.env.NODE_ENV === 'test') {
  container.register('ILogger', { useClass: NullLogger });
} else {
  container.register('ILogger', { useClass: ConsoleLogger });
}
```

## Troubleshooting

### "Cannot resolve dependency"

Ensure the service is registered:

```typescript
container.register('MyService', { useClass: MyService });
```

### "Cannot read property of undefined"

Check that `reflect-metadata` is imported at app entry point.

### "Circular dependency"

Use lazy resolution or refactor to break the cycle:

```typescript
// Instead of direct injection
constructor(@inject('A') private a: A) {}

// Use factory/lazy
constructor(@inject('A') private getA: () => A) {}
```

## See Also

- [TSyringe Documentation](https://github.com/microsoft/tsyringe)
- [src/container.ts](../src/container.ts) - Container configuration
- [src/di-example.ts](../src/di-example.ts) - Usage examples
- [src/services/README.md](../src/services/README.md) - Services layer
