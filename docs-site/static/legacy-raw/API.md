# MailGoat Programmatic API (Node.js)

This guide documents using MailGoat as a Node.js library.

Important: `mailgoat` is currently CLI-first. The package root does not export `send()`/`inbox.*` helpers yet. For programmatic usage today, import the published modules from `dist/*`.

## Installation

```bash
npm install mailgoat
```

## Importing

If you use `EmailService`/DI-based classes, load `reflect-metadata` once at process startup.

```js
require('reflect-metadata');
```

### CommonJS

```js
const { PostalClient } = require('mailgoat/dist/lib/postal-client');
const { ConfigManager } = require('mailgoat/dist/lib/config');
const { InboxStore } = require('mailgoat/dist/lib/inbox-store');
const { EmailService } = require('mailgoat/dist/services');
const { ProviderFactory } = require('mailgoat/dist/providers');
```

### ES Modules

```js
import { PostalClient } from 'mailgoat/dist/lib/postal-client.js';
import { ConfigManager } from 'mailgoat/dist/lib/config.js';
import { InboxStore } from 'mailgoat/dist/lib/inbox-store.js';
import { EmailService } from 'mailgoat/dist/services/index.js';
import { ProviderFactory } from 'mailgoat/dist/providers/index.js';
```

## Configuration

MailGoat expects this shape:

```js
const config = {
  server: 'https://postal.example.com',
  fromAddress: 'sender@example.com',
  api_key: 'your-api-key-here',
};
```

You can also load/save `~/.mailgoat/config.json` with `ConfigManager`.

## Sending Emails

### Basic Send (PostalClient)

```js
const { PostalClient } = require('mailgoat/dist/lib/postal-client');

const client = new PostalClient(config);

const result = await client.sendMessage({
  to: ['user@example.com'],
  subject: 'Hello',
  plain_body: 'Test message',
});

// result: { message_id, messages, rate_limit? }
console.log(result.message_id);
```

### With Attachments

```js
const fs = require('fs');

const pdfBase64 = fs.readFileSync('./report.pdf').toString('base64');

await client.sendMessage({
  to: ['user@example.com'],
  subject: 'Report',
  plain_body: 'See attached',
  attachments: [
    {
      name: 'report.pdf',
      content_type: 'application/pdf',
      data: pdfBase64,
    },
  ],
});
```

### HTML Email

```js
await client.sendMessage({
  to: ['user@example.com'],
  subject: 'Welcome',
  html_body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
});
```

### Multiple Recipients

```js
await client.sendMessage({
  to: ['user1@example.com', 'user2@example.com'],
  cc: ['manager@example.com'],
  bcc: ['admin@example.com'],
  subject: 'Team Update',
  plain_body: 'Important announcement',
});
```

### Higher-Level Send (EmailService)

`EmailService` wraps provider + validation and uses app-style names (`body`, `html`, `replyTo`).

```js
const { EmailService } = require('mailgoat/dist/services');
const { ProviderFactory } = require('mailgoat/dist/providers');

const provider = ProviderFactory.createFromConfig(config);
const emailService = new EmailService(provider);

const sent = await emailService.sendEmail({
  to: ['user@example.com'],
  subject: 'Hello',
  body: 'Test message',
});

console.log(sent.messageId);
```

## Inbox Management

Programmatic inbox access in MailGoat uses `InboxStore` (local SQLite cache populated by webhook/inbox commands).

Note: `InboxStore` depends on native `better-sqlite3`. If your Node.js version changed, run `npm rebuild better-sqlite3`.

### List Cached Messages

```js
const { InboxStore } = require('mailgoat/dist/lib/inbox-store');

const inbox = new InboxStore();
const messages = inbox.listMessages({ limit: 50 });
// [{ id, from, to, subject, timestamp, read, snippet }, ...]
inbox.close();
```

### Search Cached Messages

```js
const inbox = new InboxStore();
const results = inbox.searchMessages('subject:report', 50);
inbox.close();
```

### Mark Message as Read

```js
const inbox = new InboxStore();
const updated = inbox.markAsRead('message-id');
inbox.close();
```

### Read Single Message

`InboxStore` does not expose `read(id)` directly; use `listMessages`/`searchMessages` and filter by `id`, or query Postal directly:

```js
const message = await client.getMessage('message-id', ['status', 'details', 'plain_body']);
```

## Configuration Management

### Load Config

```js
const { ConfigManager } = require('mailgoat/dist/lib/config');

const configManager = new ConfigManager();
const config = await configManager.load();
```

### Save Config

```js
const configManager = new ConfigManager();

await configManager.save({
  server: 'https://postal.example.com',
  fromAddress: 'sender@example.com',
  api_key: 'your-api-key',
});
```

## Health Check

There is no exported `health(config)` function at the package root today. Programmatically, use a lightweight connectivity probe:

```js
const client = new PostalClient(config);

try {
  // Intentionally invalid ID: proves auth + API reachability when response is structured
  await client.getMessage('health-check-id');
  console.log({ status: 'ok' });
} catch (error) {
  console.log({ status: 'error', message: error.message });
}
```

Or run the CLI command from Node:

```js
const { execFile } = require('child_process');

execFile('mailgoat', ['health', '--json'], (err, stdout) => {
  if (err) throw err;
  console.log(JSON.parse(stdout));
});
```

## Error Handling

```js
try {
  await client.sendMessage({
    to: ['user@example.com'],
    subject: 'Hello',
    plain_body: 'Test',
  });
} catch (error) {
  const msg = String(error.message || '').toLowerCase();

  if (msg.includes('authentication failed')) {
    console.error('Invalid API key');
  } else if (msg.includes('could not connect') || msg.includes('timed out')) {
    console.error('Cannot connect to server');
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

## TypeScript Support

```ts
import { PostalClient, SendMessageParams } from 'mailgoat/dist/lib/postal-client';
import { ConfigManager, MailGoatConfig } from 'mailgoat/dist/lib/config';

const config: MailGoatConfig = {
  server: 'https://postal.example.com',
  fromAddress: 'sender@example.com',
  api_key: 'your-key',
};

const params: SendMessageParams = {
  to: ['user@example.com'],
  subject: 'Hello',
  plain_body: 'Test',
};

const client = new PostalClient(config);
const result = await client.sendMessage(params);
console.log(result.message_id);
```

## Express.js Integration

```js
const express = require('express');
const { PostalClient } = require('mailgoat/dist/lib/postal-client');

const app = express();
app.use(express.json());

const client = new PostalClient({
  server: process.env.MAILGOAT_SERVER,
  fromAddress: process.env.MAILGOAT_FROM_ADDRESS,
  api_key: process.env.MAILGOAT_API_KEY,
});

app.post('/send-email', async (req, res) => {
  try {
    const result = await client.sendMessage({
      to: [req.body.email],
      subject: 'Welcome',
      plain_body: 'Thanks for signing up!',
    });

    res.json({ success: true, messageId: result.message_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Full API Reference

### `new PostalClient(config, options?)`

`config` (`MailGoatConfig`):

- `server: string`
- `fromAddress: string`
- `api_key: string`
- optional: `fromName`, `telemetry`, `metrics`

`options` (`PostalClientOptions`):

- `maxRetries?: number`
- `baseDelay?: number`
- `enableRetry?: boolean`
- `onRetry?: (info) => void`

### `PostalClient#sendMessage(params)`

`params`:

- `to: string[]` (required)
- `subject: string` (required)
- `plain_body?: string`
- `html_body?: string`
- `from?: string`
- `cc?: string[]`
- `bcc?: string[]`
- `reply_to?: string`
- `tag?: string`
- `headers?: Record<string, string>`
- `attachments?: { name; content_type; data }[]`

Returns: `Promise<{ message_id: string; messages: Record<string, { id: number; token: string }>; rate_limit?: RateLimitInfo }>`

### `PostalClient#getMessage(messageId, expansions?)`

Returns message details from Postal.

### `PostalClient#getDeliveries(messageId)`

Returns delivery attempts/statuses.

### `PostalClient#deleteMessage(messageId)`

Deletes a message by ID.

### `ConfigManager#load()`

Loads config from `~/.mailgoat/config.json` (with env overrides).

### `ConfigManager#save(config)`

Saves config to `~/.mailgoat/config.json` with secure file mode.

### `InboxStore#listMessages(options?)`

Lists cached inbox messages.

### `InboxStore#searchMessages(query, limit?)`

Searches cached inbox messages.

### `InboxStore#markAsRead(id)`

Marks a cached message as read.

### `EmailService#sendEmail(options)`

High-level validated send via provider abstraction.

### `EmailService#readEmail(messageId, options?)`

High-level read with expansion controls.

## Notes

- Current npm package shape is CLI-first; deep imports (`mailgoat/dist/...`) are required for library usage.
- If you want a stable top-level SDK API (`mailgoat.send`, `mailgoat.inbox.*`, etc.), treat that as a follow-up feature to add explicit root exports.
