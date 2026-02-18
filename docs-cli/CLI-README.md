# MailGoat CLI

**CLI-first email provider for AI agents**

MailGoat is a lightweight Node.js CLI that wraps [Postal](https://github.com/postalserver/postal)'s HTTP API with an agent-friendly interface. Built for autonomous AI agents who need programmatic email access.

## Features

- 🚀 **Simple CLI** - Send and read emails via terminal commands
- 🤖 **Agent-first** - Designed for programmatic use by AI agents
- 📦 **Thin wrapper** - Minimal abstraction over Postal's API
- 🔒 **Self-hosted** - Run on your own infrastructure
- 📊 **JSON mode** - Machine-readable output for parsing
- ⚡ **No dependencies** - Just Node.js and a Postal instance

## Status: MVP Prototype

This is a working prototype demonstrating core functionality. Not production-ready.

**What works:**
- ✅ Sending emails
- ✅ Reading specific messages (by ID)
- ✅ Webhook-based inbox caching and listing
- ✅ Configuration management
- ✅ JSON output mode

**Known limitations:**
- ❌ Attachments (not in MVP scope)
- ❌ Self-registration flow (manual Postal setup required)

## Prerequisites

1. **Node.js** ≥ 18.0.0
2. **Postal instance** - Self-hosted mail server
   - See [Postal Setup Guide](./docs/postal-setup.md) (TODO)
   - Requires: Postal server running + API credentials

## Installation

### From Source (Development)

```bash
git clone <repo-url>
cd mailgoat-cli
npm install
npm run build
npm link  # Makes 'mailgoat' command available globally
```

### From npm (Future)

```bash
npm install -g mailgoat
```

## Quick Start

### 1. Configure MailGoat

Interactive setup:

```bash
mailgoat config init
```

Manual setup (`~/.mailgoat/config.yml`):

```yaml
server: postal.example.com
email: agent@example.com
api_key: your-api-key-here
```

**Getting API credentials:**
1. Log into your Postal web UI
2. Navigate to your mail server settings
3. Create a new API credential
4. Copy the key into your config

### 2. Send an Email

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "Hello from MailGoat" \
  --body "This is a test message from the CLI"
```

### 3. Read a Message

```bash
mailgoat read <message-id>
```

**Where to get message IDs:**
- From send command output (returns message ID)
- From Postal web UI
- From webhooks (when implemented)
- From delivery notifications

## Commands

### `mailgoat send`

Send an email message.

```bash
mailgoat send [options]

Required:
  -t, --to <emails...>      Recipient email address(es)
  -s, --subject <text>      Email subject
  -b, --body <text>         Email body (plain text)

Optional:
  -f, --from <email>        Sender email (defaults to config email)
  --cc <emails...>          CC recipients
  --bcc <emails...>         BCC recipients
  --html                    Treat body as HTML instead of plain text
  --tag <tag>               Custom tag for this message
  --attach <file>           Attach file (repeat flag for multiple files)
  --json                    Output result as JSON
```

**Examples:**

```bash
# Simple message
mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "Hello world"

# Multiple recipients
mailgoat send \
  --to user1@example.com user2@example.com \
  --cc manager@example.com \
  --subject "Team Update" \
  --body "Here's the latest update..."

# HTML email
mailgoat send \
  --to user@example.com \
  --subject "Rich Content" \
  --body "<h1>Hello</h1><p>This is <strong>HTML</strong></p>" \
  --html

# JSON output (for parsing)
mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "Message" \
  --json

# Single attachment
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "See attached" \
  --attach report.pdf

# Multiple attachments
mailgoat send \
  --to user@example.com \
  --subject "Artifacts" \
  --body "Attached files" \
  --attach report.pdf \
  --attach screenshot.png
```

### `mailgoat read`

Read a specific message by ID.

```bash
mailgoat read <message-id> [options]

Options:
  --json                    Output result as JSON
  --full                    Include all expansions (headers, attachments, etc.)
```

**Examples:**

```bash
# Read message
mailgoat read abc123-def456-ghi789

# Full details (headers, attachments)
mailgoat read abc123 --full

# JSON output
mailgoat read abc123 --json
```

### `mailgoat inbox`

Manage local inbox cache and webhook receiver.

```bash
mailgoat inbox list [options]
mailgoat inbox search "<query>" [options]
mailgoat inbox serve [options]

Options:
  list:
    --unread                  Show only unread messages
    --since <time>            Filter by time (e.g. 1h, 30m, 2d, ISO timestamp)
    -l, --limit <n>           Maximum number of messages to show (default: 50)
    --json                    Output result as JSON

  search:
    "<query>"                 subject:<text>, from:<email>, to:<email>, or free text
    -l, --limit <n>           Maximum number of messages to show (default: 50)
    --json                    Output result as JSON

  serve:
    --host <host>             Bind address (default: 127.0.0.1)
    --port <port>             Listen port (default: 3000)
    --path <path>             Webhook path (default: /webhooks/postal)
```

MailGoat caches incoming webhook notifications in SQLite (`~/.mailgoat/inbox/messages.db`) and uses that local cache for listing/search.

#### Webhook Setup

1. Run local receiver:

```bash
mailgoat inbox serve --host 0.0.0.0 --port 3000 --path /webhooks/postal
```

2. Expose this endpoint publicly (for local dev, use tunnel tools like ngrok/cloudflared).
3. In Postal, configure a webhook pointing to:
   `https://<your-public-host>/webhooks/postal`
4. Send test email, then verify cache:

```bash
mailgoat inbox list
mailgoat inbox list --unread
mailgoat inbox list --since 1h
mailgoat inbox search "subject:invoice"
```

Messages are marked read automatically after successful `mailgoat read <message-id>`.

### `mailgoat config`

Manage configuration.

```bash
# Interactive setup
mailgoat config init

# Overwrite existing config
mailgoat config init --force

# Show current config
mailgoat config show

# Show config as JSON
mailgoat config show --json

# Show config file path
mailgoat config path
```

## Configuration

Config file location: `~/.mailgoat/config.yml`

```yaml
server: postal.example.com    # Postal server hostname
email: agent@example.com      # Your email address
api_key: abc123...            # Postal API credential
```

**Security:**
- Config file is created with mode `0600` (user read/write only)
- Config directory (`~/.mailgoat/`) is created with mode `0700`
- Never commit API keys to version control

## Postal API Integration

MailGoat uses Postal's **Legacy API** (the current stable API):

### Endpoints Used

**Send Message:**
```
POST /api/v1/send/message
```

**Get Message:**
```
POST /api/v1/messages/message
```

**Get Deliveries:**
```
POST /api/v1/messages/deliveries
```

### Authentication

Uses Postal's API key authentication:

```
X-Server-API-Key: your-api-key
```

### Example API Calls

**Send (raw cURL):**

```bash
curl -X POST https://postal.example.com/api/v1/send/message \
  -H "X-Server-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["recipient@example.com"],
    "from": "sender@example.com",
    "subject": "Test",
    "plain_body": "Hello"
  }'
```

**Read (raw cURL):**

```bash
curl -X POST https://postal.example.com/api/v1/messages/message \
  -H "X-Server-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "message-id-here",
    "_expansions": ["status", "details", "plain_body"]
  }'
```

## Postal API Limitations

### No "List Messages" Endpoint

Postal's Legacy API **does not provide an endpoint to list messages**. You can:
- Send messages (`/send/message`)
- Retrieve a specific message by ID (`/messages/message`)
- BUT you cannot list all messages in an inbox

**Why this limitation exists:**

Postal is designed as a **mail delivery platform** (like Sendgrid, Mailgun), not a full email client. It focuses on:
- Sending outbound mail
- Tracking delivery status
- Processing webhooks

It assumes you'll either:
1. Use webhooks to track messages as they arrive
2. Use the Postal web UI for manual inspection
3. Query the database directly (if self-hosted)

### Workarounds

**1. Webhooks (Recommended for Production)**

Configure Postal to send webhooks for incoming messages:

```yaml
# Postal webhook config (in Postal UI)
Webhook URL: https://your-agent.local/mail-webhook
Events: MessageReceived, MessageBounced, etc.
```

Then maintain a local cache:

```
Agent receives webhook → Store message metadata → Agent can query local cache
```

**2. Direct Database Query (Self-hosted only)**

If you control the Postal server, query the database:

```sql
SELECT id, message_id, subject, mail_from, rcpt_to, timestamp
FROM messages
WHERE server_id = YOUR_SERVER_ID
ORDER BY timestamp DESC
LIMIT 20;
```

**3. Custom API Endpoint**

Add a custom endpoint to Postal:

```ruby
# app/controllers/legacy_api/messages_controller.rb
def list
  messages = @current_credential.server.messages.limit(params[:limit] || 20)
  render_success messages
end
```

**4. Postal Web UI API (Undocumented)**

Postal's web UI has internal APIs, but they're not documented/stable. Not recommended.

## Agent Usage Examples

### OpenClaw Integration

```typescript
// In an OpenClaw skill or agent
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function sendEmail(to: string, subject: string, body: string) {
  const cmd = `mailgoat send --to "${to}" --subject "${subject}" --body "${body}" --json`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

async function readEmail(messageId: string) {
  const cmd = `mailgoat read "${messageId}" --json`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

// Usage
const result = await sendEmail(
  'user@example.com',
  'Status Update',
  'Task completed successfully'
);
console.log(`Sent message: ${result.message_id}`);
```

### Shell Scripting

```bash
#!/bin/bash
# Send daily report

RECIPIENTS="manager@example.com team@example.com"
SUBJECT="Daily Report - $(date +%Y-%m-%d)"
BODY="Report for $(date +%Y-%m-%d):\n\nTasks: 5 completed\nStatus: All systems operational"

mailgoat send \
  --to $RECIPIENTS \
  --subject "$SUBJECT" \
  --body "$BODY" \
  --tag "daily-report"
```

### Python Integration

```python
import subprocess
import json

def mailgoat_send(to, subject, body):
    """Send email via MailGoat CLI"""
    cmd = [
        'mailgoat', 'send',
        '--to', to,
        '--subject', subject,
        '--body', body,
        '--json'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

def mailgoat_read(message_id):
    """Read email via MailGoat CLI"""
    cmd = ['mailgoat', 'read', message_id, '--json']
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

# Usage
response = mailgoat_send(
    'user@example.com',
    'Hello',
    'This is a test message'
)
print(f"Sent: {response['message_id']}")
```

## Architecture

```
┌─────────────────────────────────────┐
│         MailGoat CLI                │
│   (TypeScript, Commander.js)        │
│                                     │
│  • Send, Read, Config commands      │
│  • JSON output mode                 │
│  • Config management                │
└─────────────┬───────────────────────┘
              │ HTTP API calls
              ▼
┌─────────────────────────────────────┐
│       Postal Instance               │
│   (Self-hosted mail server)         │
│                                     │
│  • SMTP server                      │
│  • Message storage                  │
│  • Delivery tracking                │
│  • Web UI                           │
└─────────────────────────────────────┘
```

**Design Philosophy:**

1. **Thin wrapper** - Minimal abstraction over Postal's API
2. **Direct mode** - CLI talks directly to Postal (no middleware)
3. **Agent-first** - Commands designed for programmatic use
4. **JSON mode** - Machine-readable output for parsing
5. **No state** - CLI is stateless (config only)

## Development

### Project Structure

```
mailgoat-cli/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── send.ts
│   │   ├── read.ts
│   │   ├── inbox.ts          # Stub (not implemented)
│   │   └── config.ts
│   └── lib/                  # Shared libraries
│       ├── config.ts         # Config file management
│       ├── postal-client.ts  # Postal API client
│       └── formatter.ts      # Output formatting
├── bin/
│   └── mailgoat.js           # Executable entry point
├── dist/                     # Compiled JavaScript (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

### Build

```bash
npm install
npm run build
```

### Local Development

```bash
# Watch mode (recompile on changes)
npm run dev

# Link for testing
npm link

# Test command
mailgoat --help
```

### Testing

```bash
# Manual testing checklist:

# 1. Config
mailgoat config init
mailgoat config show

# 2. Send
mailgoat send \
  --to test@example.com \
  --subject "Test" \
  --body "Hello"

# 3. Read (use message ID from step 2)
mailgoat read <message-id>

# 4. JSON mode
mailgoat send --to test@example.com --subject "Test" --body "Hi" --json
```

## Roadmap

### Phase 1: MVP ✅ (Current)

- [x] CLI framework setup
- [x] Configuration management
- [x] Send command
- [x] Read command
- [x] Inbox command (stub with documentation)
- [x] JSON output mode
- [x] Postal API integration
- [x] README documentation

### Phase 2: Self-Registration (Planned)

- [ ] MailGoat backend service
- [ ] Self-registration API
- [ ] `mailgoat register` command
- [ ] Credential management
- [ ] Hosted Postal instances

### Phase 3: Webhooks (Planned)

- [ ] Webhook setup command
- [ ] Local message cache
- [ ] Inbox listing (using webhook data)
- [ ] Real-time notifications
- [ ] `mailgoat notify` command

### Phase 4: Advanced Features (Future)

- [ ] Attachments support
- [ ] Message filtering
- [ ] Search functionality
- [ ] Rate limiting
- [ ] Quota management
- [ ] SaaS offering

## Contributing

This is an MVP prototype. Contributions welcome! Areas needing help:

- **Inbox implementation** - Solve the "list messages" problem
- **Webhook integration** - Build local cache system
- **Testing** - Unit and integration tests
- **Documentation** - Postal setup guide
- **Error handling** - Improve error messages

## License

MIT License - see LICENSE file for details

## Resources

- **Postal** - https://github.com/postalserver/postal
- **Architecture Spike** - See `docs/architecture-spike.md` in parent repo
- **OpenGoat** - https://github.com/opengoat (parent organization)

## Support

- Issues: GitHub Issues (once repo is public)
- Discord: OpenGoat community server (TBD)
- Email: support@mailgoat.dev (TBD)

---

**Built with ❤️ for AI agents by the OpenGoat team**
