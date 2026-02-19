# ValidationService

Centralized validation logic for MailGoat CLI.

## Overview

The `ValidationService` class provides a consistent, testable way to validate all user inputs across the CLI. It replaces scattered validation functions with a unified service that can be easily mocked and tested.

## Architecture

### Design Pattern: Service Layer

The ValidationService follows the service layer pattern:

- **Single Responsibility:** Only handles validation logic
- **Dependency Injection:** Can be injected into commands
- **Testability:** Easy to mock and unit test
- **Consistency:** All validation returns `ValidationResult`

### ValidationResult Interface

```typescript
interface ValidationResult {
  valid: boolean; // Whether validation passed
  error?: string; // Human-readable error message
  field?: string; // Field name that failed validation
}
```

## Usage

### Basic Validation

```typescript
import { validationService } from './lib/validation-service';

// Validate email
const result = validationService.validateEmail('user@example.com');
if (!result.valid) {
  console.error(result.error);
}

// Validate URL
const urlResult = validationService.validateUrl('https://example.com');

// Validate API key
const keyResult = validationService.validateApiKey('abc123_key');
```

### Send Options Validation

```typescript
const validation = validationService.validateSendOptions({
  to: ['user@example.com'],
  cc: ['manager@example.com'],
  subject: 'Important Update',
  body: 'Message content',
  tag: 'newsletter',
});

if (!validation.valid) {
  throw new Error(validation.error);
}
```

### Config Validation

```typescript
const configValidation = validationService.validateConfig({
  server: 'postal.example.com',
  email: 'agent@example.com',
  api_key: 'your_api_key_here',
});

if (!configValidation.valid) {
  console.error(`Configuration error: ${configValidation.error}`);
}
```

## Methods

### Email Validation

#### `validateEmail(email: string): ValidationResult`

Validates a single email address using RFC 5322 compliant regex.

**Valid formats:**

- `user@example.com`
- `first.last@company.co.uk`
- `user+tag@example.com`

**Invalid formats:**

- `user@` (missing domain)
- `@example.com` (missing local part)
- `user@.com` (invalid domain)

#### `validateEmails(emails: string[], fieldName?: string): ValidationResult`

Validates multiple email addresses at once.

```typescript
const result = validationService.validateEmails(['user1@example.com', 'user2@example.com'], 'to');
```

### URL Validation

#### `validateUrl(url: string): ValidationResult`

Validates URLs, automatically adding `https://` if no protocol specified.

**Valid formats:**

- `https://example.com`
- `http://postal.local:5000`
- `example.com` (auto-prefixed with https://)

### API Key Validation

#### `validateApiKey(key: string): ValidationResult`

Validates Postal API keys.

**Requirements:**

- Minimum 10 characters
- Alphanumeric, dashes, and underscores only
- No spaces or special characters

### Message Validation

#### `validateSubject(subject: string): ValidationResult`

Validates email subject lines.

**Requirements:**

- Non-empty after trimming
- Maximum 998 characters (RFC 2822 limit)

#### `validateBody(body?: string, html?: string): ValidationResult`

Validates email body content.

**Requirements:**

- At least one of `body` or `html` must be provided
- Content must be non-empty after trimming

#### `validateTag(tag: string): ValidationResult`

Validates email tags for categorization.

**Requirements:**

- 1-100 characters
- Alphanumeric, dashes, and underscores only

### File Validation

#### `validateFilePath(path: string): ValidationResult`

Validates file paths for attachments.

**Checks:**

- Non-empty path
- No null characters
- Valid path format

### Recipient Validation

#### `validateRecipientCount(count: number, type: 'to' | 'cc' | 'bcc'): ValidationResult`

Validates number of recipients doesn't exceed Postal's limits.

**Limits:**

- Maximum 50 recipients per field (to/cc/bcc)

### Comprehensive Validation

#### `validateSendOptions(options: SendOptions): ValidationResult`

Validates all send command options at once.

**Validates:**

- All recipient emails (to, cc, bcc)
- Recipient counts
- Subject
- Body (plain or HTML)
- From address (if provided)
- Tag (if provided)
- Attachments (if provided)

#### `validateConfig(config: Config): ValidationResult`

Validates configuration object.

**Validates:**

- Server URL
- Email address
- API key
- Webhook URL (if provided)

## Migration from Old Validators

### Before (Deprecated)

```typescript
import { validateEmail, validateSendInputs } from './lib/validators';

// Old way (returns boolean)
if (!validateEmail('user@example.com')) {
  console.error('Invalid email');
}

// Old way (returns object)
const result = validateSendInputs({
  to: ['user@example.com'],
  subject: 'Test',
  body: 'Message',
});

if (!result.valid) {
  console.error(result.error);
}
```

### After (Recommended)

```typescript
import { validationService } from './lib/validation-service';

// New way (returns ValidationResult)
const result = validationService.validateEmail('user@example.com');
if (!result.valid) {
  console.error(result.error);
  console.error(`Field: ${result.field}`);
}

// New way (consistent interface)
const sendResult = validationService.validateSendOptions({
  to: ['user@example.com'],
  subject: 'Test',
  body: 'Message',
});

if (!sendResult.valid) {
  console.error(sendResult.error);
}
```

## Testing

The ValidationService is designed for easy unit testing:

```typescript
import { ValidationService } from './lib/validation-service';

describe('ValidationService', () => {
  const service = new ValidationService();

  test('validateEmail with valid email', () => {
    const result = service.validateEmail('user@example.com');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('validateEmail with invalid email', () => {
    const result = service.validateEmail('invalid-email');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid email format');
  });

  test('validateSendOptions with missing subject', () => {
    const result = service.validateSendOptions({
      to: ['user@example.com'],
      subject: '',
      body: 'Test',
    });
    expect(result.valid).toBe(false);
    expect(result.field).toBe('subject');
  });
});
```

## Benefits

### 1. Consistency

All validation uses the same `ValidationResult` interface with consistent error messages.

### 2. Testability

Easy to unit test without dependencies on external systems.

### 3. Maintainability

All validation logic in one place, easier to update and extend.

### 4. Debugging

Includes field names in errors for easier debugging.

### 5. Type Safety

Full TypeScript support with proper interfaces.

## Best Practices

### 1. Always Check Results

```typescript
const result = validationService.validateEmail(email);
if (!result.valid) {
  // Handle error properly
  throw new Error(result.error);
}
```

### 2. Provide Context

Use the field name parameter for better error messages:

```typescript
validationService.validateEmails(emails, 'CC');
// Error: "Invalid CC address: ..."
```

### 3. Validate Early

Validate inputs as early as possible in your command flow:

```typescript
async function sendCommand(options) {
  // Validate first
  const validation = validationService.validateSendOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Then proceed with business logic
  await client.sendMessage(options);
}
```

### 4. Use Singleton

Import the singleton instance for convenience:

```typescript
import { validationService } from './lib/validation-service';
```

Or create your own instance for testing:

```typescript
import { ValidationService } from './lib/validation-service';
const customValidator = new ValidationService();
```

## Future Enhancements

Potential improvements:

1. **Custom Validators:** Allow registration of custom validation rules
2. **Async Validation:** Support for async validation (e.g., checking if email exists)
3. **Validation Schemas:** JSON Schema or Zod integration
4. **i18n Support:** Internationalized error messages
5. **Validation Middleware:** Express-style validation middleware

## Related Documentation

- [Testing Guide](./testing.md)
- [Configuration Guide](./configuration.md)
- [Error Handling](./error-handling.md)
