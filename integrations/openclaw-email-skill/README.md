# OpenClaw Email Skill

Production-ready email skill for OpenClaw agents using MailGoat/Postal.

## Quick Start

### 1. Install

Copy this skill to your OpenClaw skills directory:

```bash
cp -r openclaw-email-skill ~/.openclaw/skills/email
cd ~/.openclaw/skills/email
npm install
```

### 2. Configure

Create `config.json` from the example:

```bash
cp config.example.json config.json
```

Edit `config.json` with your Postal credentials:

```json
{
  "postal": {
    "serverUrl": "https://postal.example.com",
    "apiKey": "your_api_key_here",
    "fromEmail": "agent@example.com"
  }
}
```

### 3. Test

```bash
# Send a test email
node lib/send.js \
  --to test@example.com \
  --subject "Test from OpenClaw" \
  --body "This is a test email"
```

## Usage in OpenClaw Workflows

### Send Email

```typescript
// In your OpenClaw agent
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function sendEmail(to, subject, body) {
  const { stdout } = await execAsync(
    `node ~/.openclaw/skills/email/lib/send.js --to "${to}" --subject "${subject}" --body "${body}" --json`
  );

  return JSON.parse(stdout);
}

// Use it
const result = await sendEmail(
  'user@example.com',
  'Hello from OpenClaw',
  'This email was sent by an AI agent!'
);

console.log(`Email sent: ${result.messageId}`);
```

### Check Inbox

```typescript
async function checkInbox() {
  const { stdout } = await execAsync(
    'node ~/.openclaw/skills/email/lib/inbox.js --unread --limit 10'
  );

  return JSON.parse(stdout);
}

// Use it
const messages = await checkInbox();
console.log(`Found ${messages.length} unread messages`);
```

### Read Message

```typescript
async function readMessage(messageId) {
  const { stdout } = await execAsync(`node ~/.openclaw/skills/email/lib/read.js ${messageId}`);

  return JSON.parse(stdout);
}

// Use it
const message = await readMessage('msg_123');
console.log(`From: ${message.message.from}`);
console.log(`Subject: ${message.message.subject}`);
```

## CLI Commands

All commands support `--json` for JSON output.

### send.js

```bash
node lib/send.js \
  --to user@example.com \
  --subject "Subject" \
  --body "Body text"

# With multiple recipients
node lib/send.js \
  --to user1@example.com,user2@example.com \
  --cc manager@example.com \
  --subject "Team Update" \
  --body "Message"

# With HTML
node lib/send.js \
  --to user@example.com \
  --subject "HTML Email" \
  --html "<h1>Hello</h1><p>This is HTML</p>" \
  --body "Plain text fallback"

# JSON output
node lib/send.js \
  --to user@example.com \
  --subject "Test" \
  --body "Test" \
  --json
```

### inbox.js

```bash
# List all messages
node lib/inbox.js

# Unread only
node lib/inbox.js --unread

# Limit results
node lib/inbox.js --limit 10

# Since timestamp
node lib/inbox.js --since "1 hour ago"
```

### read.js

```bash
# Read message by ID
node lib/read.js msg_123

# With JSON output
node lib/read.js msg_123 --json
```

## Examples

See the `examples/` directory:

- `send-notification.js` - Send alert email
- `process-inbox.js` - Process commands from inbox (coming soon)
- `auto-responder.js` - Automated replies (coming soon)

Run an example:

```bash
node examples/send-notification.js
```

## API Reference

### PostalClient

The underlying Postal API client:

```javascript
const { PostalClient, loadConfig } = require('./lib/postal-client');

const config = loadConfig();
const client = new PostalClient(config);

// Send email
const result = await client.send({
  to: 'user@example.com',
  subject: 'Subject',
  body: 'Body text',
});

// Read inbox
const inbox = await client.inbox({
  unread: true,
  limit: 10,
});

// Read message
const message = await client.read('msg_123');
```

## Configuration

`config.json` structure:

```json
{
  "postal": {
    "serverUrl": "https://postal.example.com",
    "apiKey": "your_api_key_here",
    "fromEmail": "agent@example.com"
  },
  "defaults": {
    "checkInterval": 60000,
    "maxInboxResults": 50
  }
}
```

## Error Handling

All commands return JSON with `success` field:

**Success:**

```json
{
  "success": true,
  "messageId": "msg_abc123",
  "timestamp": "2026-02-15T18:30:00.000Z"
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid API key",
    "details": {...}
  }
}
```

Error codes:

- `AUTH_FAILED` - Authentication error
- `NETWORK_ERROR` - Connection failure
- `INVALID_INPUT` - Validation error
- `NOT_FOUND` - Message not found
- `RATE_LIMIT` - Rate limit exceeded

## Troubleshooting

### Config file not found

Make sure `config.json` exists:

```bash
ls -la config.json
# If not found:
cp config.example.json config.json
# Then edit with your credentials
```

### Authentication failed

Test your Postal API key:

```bash
curl -H "X-Server-API-Key: YOUR_KEY" \
  https://postal.example.com/api/v1/send/message \
  -d '{"to":["test@example.com"],"from":"test@example.com","subject":"Test","plain_body":"Test"}'
```

### Dependencies missing

Install dependencies:

```bash
npm install
```

## Migration to MailGoat CLI

When the MailGoat CLI is available, you can easily migrate:

**Before (Postal API):**

```javascript
const client = new PostalClient(config);
await client.send({...});
```

**After (MailGoat CLI):**

```javascript
const { stdout } = await execAsync('mailgoat send --to ... --subject ... --body ...');
```

The CLI command interface remains the same!

## Development

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

## Support

- **Issues:** https://github.com/mailgoat/mailgoat/issues
- **Documentation:** https://docs.mailgoat.dev
- **Community:** https://discord.gg/mailgoat

## License

MIT
