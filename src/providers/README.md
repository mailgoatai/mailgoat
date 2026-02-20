# Mail Providers

Abstraction layer for email service providers in MailGoat.

## Overview

The provider system allows MailGoat to support multiple email service providers through a common interface. This makes it easy to:

- Switch between providers without changing application code
- Add new providers without modifying existing code
- Test with mock providers
- Support multiple providers simultaneously (future)

## Architecture

```
IMailProvider (interface)
    ↓ implements
PostalProvider → PostalClient
    ↓ future
SendGridProvider
SMTPProvider
SESProvider
```

## Usage

### Basic Usage

```typescript
import { ProviderFactory } from './providers';

// Create provider from config
const provider = ProviderFactory.createFromConfig(config);

// Send message
const response = await provider.sendMessage({
  to: ['user@example.com'],
  subject: 'Hello',
  plain_body: 'Test message',
});

// Get message details
const message = await provider.getMessage(response.message_id);
```

### Explicit Provider Type

```typescript
import { ProviderFactory } from './providers';

// Create specific provider
const postalProvider = ProviderFactory.create('postal', config, {
  maxRetries: 3,
  enableRetry: true,
});
```

### Direct Provider Instantiation

```typescript
import { PostalProvider } from './providers/postal';

// Create provider directly
const provider = new PostalProvider(config, {
  maxRetries: 3,
  baseDelay: 1000,
});
```

## Supported Providers

| Provider | Status      | Notes                                     |
| -------- | ----------- | ----------------------------------------- |
| Postal   | ✅ Complete | Full implementation using Legacy API      |
| Mailgun  | ✅ Complete | REST API via `mailgun.js` + events lookup |
| SendGrid | 🚧 Planned  | Coming soon                               |
| SMTP     | 🚧 Planned  | Direct SMTP support                       |
| AWS SES  | 🚧 Planned  | Amazon Simple Email Service               |
| Postmark | 📋 Future   | Considered for future implementation      |

## Interface: IMailProvider

All providers must implement this interface:

### Required Methods

- `sendMessage(params: SendMessageParams): Promise<SendMessageResponse>`
- `getMessage(id: string, expansions?: string[]): Promise<MessageDetails>`

### Optional Methods

- `listMessages(options?: ListMessagesOptions): Promise<Message[]>`
- `deleteMessage(id: string): Promise<void>`
- `getDeliveries(id: string): Promise<any[]>`
- `testConnection(): Promise<boolean>`

## Adding a New Provider

1. Create provider directory: `src/providers/[provider-name]/`

2. Implement the interface:

```typescript
// src/providers/sendgrid/sendgrid-provider.ts
import { IMailProvider, SendMessageParams, SendMessageResponse } from '../mail-provider.interface';

export class SendGridProvider implements IMailProvider {
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    // Implementation
  }

  async getMessage(id: string): Promise<MessageDetails> {
    // Implementation
  }
}
```

3. Export from index:

```typescript
// src/providers/sendgrid/index.ts
export { SendGridProvider } from './sendgrid-provider';
```

4. Register in ProviderFactory:

```typescript
// src/providers/provider-factory.ts
case 'sendgrid':
  return new SendGridProvider(config, options);
```

5. Update main exports:

```typescript
// src/providers/index.ts
export { SendGridProvider } from './sendgrid';
```

## Provider-Specific Features

Some providers may support features not available in others. Handle these with optional methods:

```typescript
// Check if provider supports listing
if (provider.listMessages) {
  const messages = await provider.listMessages({ limit: 10 });
}

// Fallback for unsupported features
try {
  await provider.deleteMessage(id);
} catch (error) {
  console.log('Provider does not support message deletion');
}
```

## Configuration

Providers accept two types of configuration:

### Provider Config

Server details, credentials, etc.

```typescript
interface ProviderConfig {
  type: 'postal' | 'sendgrid' | 'smtp' | 'ses';
  server: string;
  email: string;
  api_key: string;
  // Provider-specific fields
}
```

### Provider Options

Behavior settings (retry, timeout, etc.)

```typescript
interface ProviderOptions {
  maxRetries?: number;
  baseDelay?: number;
  enableRetry?: boolean;
  timeout?: number;
  // Provider-specific options
}
```

## Testing

Providers should be testable with mocks:

```typescript
class MockProvider implements IMailProvider {
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    return {
      message_id: 'mock-message-id',
    };
  }

  async getMessage(id: string): Promise<MessageDetails> {
    return {
      id: 1,
      token: 'mock-token',
      details: {
        rcpt_to: 'user@example.com',
        mail_from: 'sender@example.com',
        subject: 'Mock message',
        message_id: id,
        timestamp: Date.now(),
      },
    };
  }
}
```

## Migration Guide

### From PostalClient to Provider

**Before:**

```typescript
import { PostalClient } from './lib/postal-client';

const client = new PostalClient(config);
const response = await client.sendMessage(params);
```

**After:**

```typescript
import { ProviderFactory } from './providers';

const provider = ProviderFactory.createFromConfig(config);
const response = await provider.sendMessage(params);
```

The interface is identical, so no changes to calling code are needed.

## Future Enhancements

- **Multi-provider support**: Send via multiple providers for redundancy
- **Provider selection strategies**: Round-robin, failover, cost-based
- **Provider health monitoring**: Automatic failover on provider issues
- **Rate limiting per provider**: Respect provider-specific limits
- **Provider analytics**: Track performance, cost, delivery rates

## See Also

- [IMailProvider Interface](./mail-provider.interface.ts)
- [PostalProvider Implementation](./postal/postal-provider.ts)
- [ProviderFactory](./provider-factory.ts)
