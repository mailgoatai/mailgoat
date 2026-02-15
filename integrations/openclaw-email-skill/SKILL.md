# OpenClaw Email Skill

Send and receive emails using MailGoat/Postal within OpenClaw agent workflows.

## Overview

This skill provides full email capabilities to OpenClaw agents:

- ✉️ **Send emails** - Text, HTML, with attachments
- 📬 **Read inbox** - Fetch and filter messages
- 📧 **Read messages** - Get full message content
- 🔍 **Search emails** - Query by sender, subject, date
- 📎 **Handle attachments** - Send and receive files
- 🤖 **Agent-optimized** - JSON output, error handling, logging

## Installation

This skill is production-ready and uses Postal's HTTP API directly (what MailGoat CLI will wrap).

### Prerequisites

- OpenClaw installed and running
- Postal server with API access
- Postal API key

### Setup

1. **Copy skill to OpenClaw skills directory:**
   ```bash
   cp -r openclaw-email-skill ~/.openclaw/skills/email
   ```

2. **Install dependencies:**
   ```bash
   cd ~/.openclaw/skills/email
   npm install
   ```

3. **Configure credentials:**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your Postal credentials
   ```

4. **Test the skill:**
   ```bash
   npm test
   ```

## Configuration

Create `config.json` in the skill directory:

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

## Usage in OpenClaw

### Send an Email

```typescript
// In your OpenClaw agent workflow
const result = await exec({
  command: 'node',
  args: ['~/.openclaw/skills/email/lib/send.js'],
  input: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello from OpenClaw',
    body: 'This email was sent by an AI agent!'
  })
});

const response = JSON.parse(result.stdout);
console.log(`Email sent: ${response.messageId}`);
```

### Read Inbox

```typescript
const result = await exec({
  command: 'node',
  args: ['~/.openclaw/skills/email/lib/inbox.js', '--unread', '--limit', '10']
});

const messages = JSON.parse(result.stdout);
console.log(`Found ${messages.length} unread messages`);
```

### Read Specific Message

```typescript
const result = await exec({
  command: 'node',
  args: ['~/.openclaw/skills/email/lib/read.js', 'message_id_here']
});

const message = JSON.parse(result.stdout);
console.log(`From: ${message.from}`);
console.log(`Subject: ${message.subject}`);
console.log(`Body: ${message.body}`);
```

## CLI Commands

The skill provides standalone CLI commands that OpenClaw can call:

### email-send

Send an email:

```bash
node lib/send.js \
  --to user@example.com \
  --subject "Subject" \
  --body "Email body"
```

With HTML:
```bash
node lib/send.js \
  --to user@example.com \
  --subject "Subject" \
  --html email.html \
  --body "Plain text fallback"
```

With attachment:
```bash
node lib/send.js \
  --to user@example.com \
  --subject "Subject" \
  --body "See attached" \
  --attach document.pdf
```

### email-inbox

List inbox messages:

```bash
# All messages
node lib/inbox.js

# Unread only
node lib/inbox.js --unread

# With limit
node lib/inbox.js --limit 10

# Time filter
node lib/inbox.js --since "2 hours ago"
```

### email-read

Read a specific message:

```bash
node lib/read.js <message_id>

# With expansions
node lib/read.js <message_id> --expand attachments
```

### email-search

Search emails:

```bash
# By sender
node lib/search.js --from user@example.com

# By subject
node lib/search.js --subject "Invoice"

# Date range
node lib/search.js --after "2026-02-01" --before "2026-02-15"
```

## Integration Patterns

### Email-Based Task Automation

```typescript
// Check inbox for commands
const inbox = await readInbox({ unread: true });

for (const msg of inbox.messages) {
  if (msg.subject.startsWith('CMD:')) {
    const command = msg.subject.replace('CMD:', '').trim();
    
    // Execute command
    const result = await executeCommand(command);
    
    // Reply with result
    await sendEmail({
      to: msg.from,
      subject: `Re: ${msg.subject}`,
      body: `Result: ${result}`
    });
  }
}
```

### Daily Digest

```typescript
// Aggregate data
const metrics = await collectMetrics();

// Generate HTML email
const html = generateDigestHTML(metrics);

// Send
await sendEmail({
  to: 'team@example.com',
  subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
  html,
  body: 'Daily digest (HTML version recommended)'
});
```

### Alert Notifications

```typescript
// Monitor condition
if (errorRate > threshold) {
  await sendEmail({
    to: 'oncall@example.com',
    subject: '[ALERT] High Error Rate Detected',
    body: `Error rate: ${errorRate}% (threshold: ${threshold}%)`,
    priority: 'high'
  });
}
```

## API Reference

### sendEmail(options)

Send an email.

**Parameters:**
- `to` (string | string[]) - Recipient email(s)
- `subject` (string) - Email subject
- `body` (string) - Plain text body
- `html` (string, optional) - HTML body
- `from` (string, optional) - Override from address
- `cc` (string[], optional) - CC recipients
- `bcc` (string[], optional) - BCC recipients
- `replyTo` (string, optional) - Reply-to address
- `attachments` (Array, optional) - File attachments

**Returns:**
```json
{
  "success": true,
  "messageId": "msg_abc123",
  "timestamp": "2026-02-15T16:30:00.000Z"
}
```

### readInbox(options)

Fetch inbox messages.

**Parameters:**
- `unread` (boolean, optional) - Only unread messages
- `limit` (number, optional) - Max results (default: 50)
- `since` (string, optional) - Time filter ("1 hour ago", ISO date)
- `before` (string, optional) - Before date

**Returns:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "from": "user@example.com",
      "subject": "Hello",
      "receivedAt": "2026-02-15T16:30:00.000Z",
      "unread": true,
      "hasAttachments": false
    }
  ],
  "count": 1
}
```

### readMessage(messageId)

Read full message details.

**Parameters:**
- `messageId` (string) - Message ID from inbox

**Returns:**
```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "from": "user@example.com",
    "to": ["agent@example.com"],
    "subject": "Hello",
    "body": "Email content...",
    "htmlBody": "<p>HTML content...</p>",
    "receivedAt": "2026-02-15T16:30:00.000Z",
    "attachments": []
  }
}
```

## Error Handling

All commands return JSON with `success` boolean:

**Success:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid API key",
    "details": "..."
  }
}
```

Error codes:
- `AUTH_FAILED` - Authentication error
- `NETWORK_ERROR` - Connection failure
- `INVALID_INPUT` - Validation error
- `NOT_FOUND` - Message not found
- `RATE_LIMIT` - Rate limit exceeded

## Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires Postal)
npm run test:integration

# Test CLI commands
npm run test:cli
```

## Migration to MailGoat CLI

When MailGoat CLI is available, update the postal client to call the CLI:

**Before (Postal API):**
```typescript
const response = await postalClient.sendEmail({...});
```

**After (MailGoat CLI):**
```typescript
const { stdout } = await exec('mailgoat send --to ... --subject ... --body ...');
const response = JSON.parse(stdout);
```

The skill interface remains the same - only the internal implementation changes.

## Examples

See `examples/` directory for complete examples:

- `examples/send-notification.js` - Send alert email
- `examples/process-inbox.js` - Process commands from inbox
- `examples/auto-responder.js` - Automated email replies
- `examples/daily-digest.js` - Generate and send daily report

## Troubleshooting

### "Authentication failed"

Check your Postal API key in `config.json`:
```bash
curl -H "X-Server-API-Key: YOUR_KEY" https://postal.example.com/api/v1/
```

### "No messages returned"

- Verify messages exist in Postal web UI
- Check date filters
- Try without filters first

### "Connection timeout"

- Check Postal server URL
- Verify network connectivity
- Check firewall rules

## Support

- Issues: https://github.com/mailgoat/mailgoat/issues
- Documentation: https://docs.mailgoat.dev
- Community: https://discord.gg/mailgoat

## License

MIT
