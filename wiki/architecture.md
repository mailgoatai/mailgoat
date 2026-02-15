# Architecture

Understanding how MailGoat works under the hood.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User / Agent                         │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                │ CLI commands
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      MailGoat CLI                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    send      │  │     read     │  │    config    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  • Parse arguments                                           │
│  • Load config (~/.mailgoat/config.yml)                     │
│  • Format request                                            │
│  • Call Postal API                                           │
│  • Format output (human or JSON)                            │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Postal HTTP API                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/v1/send/message                           │   │
│  │  GET  /api/v1/messages/:id                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  • Authenticate with API key                                 │
│  • Validate request                                          │
│  • Queue message (send) or retrieve (read)                   │
│  • Return response                                           │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
         ┌───────────────────┐   ┌───────────────────┐
         │     MariaDB       │   │     RabbitMQ      │
         │   (Messages)      │   │   (Queue)         │
         └───────────────────┘   └───────────────────┘
                    │
                    │ SMTP
                    ▼
         ┌───────────────────┐
         │  Recipient Mail   │
         │     Server        │
         └───────────────────┘
```

## Components

### 1. MailGoat CLI

**Language:** Node.js (TypeScript compiled to JavaScript)

**Purpose:** User-facing command-line interface

**Responsibilities:**
- Parse command-line arguments
- Load configuration from file or environment
- Make HTTP requests to Postal API
- Format output (human-readable or JSON)
- Handle errors and exit codes

**Files:**
- `src/cli.ts` - Main CLI entry point
- `src/commands/` - Command implementations
- `src/config.ts` - Configuration management
- `dist/` - Compiled JavaScript

**How it works:**

1. User runs: `mailgoat send --to user@example.com --subject "Test" --body "Hello"`
2. CLI parses args: `{ to: "user@example.com", subject: "Test", body: "Hello" }`
3. Loads config: `{ server: "postal.example.com", api_key: "..." }`
4. Makes HTTP POST to: `https://postal.example.com/api/v1/send/message`
5. Receives response: `{ message_id: "abc123", status: "sent" }`
6. Formats output: "✓ Email sent successfully\nMessage ID: abc123"

### 2. Postal HTTP API

**Language:** Ruby (Rails)

**Purpose:** Backend email processing server

**Responsibilities:**
- Authenticate API requests
- Accept messages for sending
- Queue messages via RabbitMQ
- Store messages in MariaDB
- Provide message retrieval API
- Handle SMTP sending/receiving
- Manage deliverability (SPF, DKIM, DMARC)

**Endpoints MailGoat uses:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/send/message` | POST | Send email |
| `/api/v1/messages/:id` | GET | Read message |

**Authentication:**
- Header: `X-Server-API-Key: your-api-key-here`

### 3. MariaDB (Database)

**Purpose:** Persistent storage for messages and metadata

**Tables (simplified):**
- `messages` - Email messages (headers, body, status)
- `domains` - Configured sending domains
- `credentials` - API keys
- `organizations` - Top-level containers
- `servers` - Mail servers within organizations

### 4. RabbitMQ (Message Queue)

**Purpose:** Asynchronous message processing

**Queues:**
- `outbound` - Messages waiting to be sent
- `processing` - Messages currently being sent
- `webhooks` - Incoming email notifications

**Why queues?**
- Decouple API from SMTP (send returns immediately)
- Handle spikes in traffic
- Retry failed sends
- Prioritize messages

## Data Flow

### Sending an Email

```
1. User
   │
   │ mailgoat send --to user@example.com --subject "Test" --body "Hello"
   ▼
2. MailGoat CLI
   │
   │ Load config: server, email, api_key
   │ Build JSON payload
   ▼
3. HTTP POST to Postal API
   │
   │ POST https://postal.example.com/api/v1/send/message
   │ Headers: X-Server-API-Key: abc123
   │ Body: {
   │   "to": "user@example.com",
   │   "from": "agent@example.com",
   │   "subject": "Test",
   │   "plain_body": "Hello"
   │ }
   ▼
4. Postal API
   │
   │ • Authenticate API key
   │ • Validate sender address
   │ • Generate message ID
   │ • Store in database
   │ • Queue in RabbitMQ
   │ • Return response
   ▼
5. HTTP Response
   │
   │ Status: 200 OK
   │ Body: {
   │   "message": {
   │     "id": "abc123",
   │     "token": "def456"
   │   }
   │ }
   ▼
6. MailGoat CLI
   │
   │ Parse response
   │ Format output
   │ Print: "✓ Email sent\nMessage ID: abc123"
   ▼
7. User sees confirmation
   
   (Meanwhile, in the background...)
   
8. RabbitMQ Worker
   │
   │ Dequeue message from RabbitMQ
   │ Connect to recipient SMTP server
   │ Send via SMTP
   │ Update status in database
```

### Reading an Email

```
1. User
   │
   │ mailgoat read abc123
   ▼
2. MailGoat CLI
   │
   │ Load config
   ▼
3. HTTP GET to Postal API
   │
   │ GET https://postal.example.com/api/v1/messages/abc123
   │ Headers: X-Server-API-Key: xyz789
   ▼
4. Postal API
   │
   │ • Authenticate API key
   │ • Lookup message in database
   │ • Return message data
   ▼
5. HTTP Response
   │
   │ Status: 200 OK
   │ Body: {
   │   "id": "abc123",
   │   "from": "sender@example.com",
   │   "to": "agent@example.com",
   │   "subject": "Test",
   │   "plain_body": "Hello",
   │   "timestamp": "2026-02-15T16:00:00Z"
   │ }
   ▼
6. MailGoat CLI
   │
   │ Parse response
   │ Format output
   ▼
7. User sees message
```

## Why We Chose Postal

### Requirements

We needed:
1. **Self-hostable** - Run on our own infrastructure
2. **API-first** - Programmatic access (not SMTP-only)
3. **Open source** - Audit the code, no vendor lock-in
4. **Production-ready** - Battle-tested, reliable
5. **Agent-friendly** - Designed for application email, not personal mailboxes

### Evaluation

| Option | Self-Host | API | Open Source | Production | Agent-First |
|--------|-----------|-----|-------------|------------|-------------|
| **Postal** | ✅ | ✅ | ✅ (MIT) | ✅ | ✅ |
| Gmail API | ❌ | ✅ | ❌ | ✅ | ❌ (OAuth) |
| SendGrid | ❌ | ✅ | ❌ | ✅ | ✅ |
| Mailgun | ❌ | ✅ | ❌ | ✅ | ✅ |
| Postfix | ✅ | ❌ | ✅ | ✅ | ❌ |
| Mailcow | ✅ | ⚠️ | ✅ | ✅ | ❌ (personal mail) |

**Postal won because:**
- ✅ Self-hostable (full control)
- ✅ HTTP API (agent-friendly)
- ✅ MIT license (truly open)
- ✅ Designed for application email (not personal mailboxes)
- ✅ Active development and community

### Alternatives Considered

**Postfix + Custom API:**
- ❌ Would need to build API ourselves
- ❌ More moving parts to maintain

**Mailcow:**
- ❌ Designed for personal email (webmail, IMAP, etc.)
- ❌ API is secondary, not primary interface

**Hosted services (SendGrid, Mailgun):**
- ❌ No self-hosting option
- ❌ Vendor lock-in
- ❌ Privacy concerns

## Design Decisions

### 1. Thin Wrapper, Not Thick Abstraction

**Decision:** MailGoat is intentionally minimal.

**Why:**
- ✅ Easier to maintain
- ✅ Less code = fewer bugs
- ✅ Postal API is already well-designed
- ✅ Users can access Postal UI for advanced features

**Trade-off:**
- ❌ Can't switch backends easily
- ✅ But we don't want to—Postal is perfect for our use case

### 2. CLI-First, Library Second

**Decision:** Ship as a CLI tool, not a library.

**Why:**
- ✅ Works from any language (shell, Python, Node.js, etc.)
- ✅ No language-specific bindings needed
- ✅ Easier for agents to use (`exec` vs importing libraries)
- ✅ JSON output mode for structured data

**Trade-off:**
- ❌ Slightly more overhead (process spawning)
- ✅ But negligible for typical use cases

### 3. Configuration File, Not Flags

**Decision:** Store credentials in `~/.mailgoat/config.yml` instead of requiring flags on every command.

**Why:**
- ✅ Less verbose commands
- ✅ Easier to use in scripts
- ✅ Secure storage (file permissions)
- ✅ Support multiple profiles

**Trade-off:**
- ❌ One extra setup step
- ✅ But `mailgoat config init` makes it easy

### 4. JSON Output Mode

**Decision:** Provide `--json` flag for machine-readable output.

**Why:**
- ✅ Parse output in scripts
- ✅ Consistent structure (unlike human-readable)
- ✅ Easier error handling
- ✅ Future-proof (won't break on formatting changes)

**Example:**
```bash
# Human-readable (default)
mailgoat send --to user@example.com --subject "Test" --body "Hello"
# Output: ✓ Email sent successfully
#         Message ID: abc123

# JSON (for scripts)
mailgoat send --to user@example.com --subject "Test" --body "Hello" --json
# Output: {"success":true,"messageId":"abc123",...}
```

### 5. No Inbox Listing (Yet)

**Decision:** MVP does not include inbox listing (`mailgoat inbox`).

**Why:**
- ⚠️ Postal API doesn't expose inbox listing endpoint
- ⚠️ Would need webhooks or polling workarounds
- ⚠️ Adds complexity to MVP

**Roadmap:** Phase 2 will add webhook-based inbox management.

## Code Structure

```
mailgoat/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── commands/
│   │   ├── send.ts         # Send command
│   │   ├── read.ts         # Read command
│   │   └── config.ts       # Config management
│   ├── api/
│   │   └── postal.ts       # Postal API client
│   ├── config/
│   │   └── loader.ts       # Config file handling
│   └── utils/
│       ├── output.ts       # Format output (human/JSON)
│       └── errors.ts       # Error handling
├── dist/                   # Compiled JavaScript
├── tests/                  # Test suite
├── docs/                   # Technical documentation
├── examples/               # Integration examples
└── package.json            # Node.js dependencies
```

## Security

### Authentication

- **API key-based** - No OAuth, no passwords
- **HTTPS only** - All API calls encrypted
- **Key rotation** - Regenerate keys anytime in Postal UI

### Configuration Storage

- **File permissions** - `chmod 600 ~/.mailgoat/config.yml`
- **Environment variables** - For containerized deployments
- **Never logged** - API keys redacted in logs

### Network

- **TLS/SSL** - HTTPS for API, STARTTLS for SMTP
- **Certificate validation** - Reject invalid certs
- **Timeouts** - Prevent hanging connections

## Performance

### Latency

Typical send latency:

```
CLI startup:        ~50ms
Config load:        ~5ms
API request:        ~100-300ms (depends on network)
Total:              ~150-350ms per email
```

### Throughput

**Single CLI instance:**
- ~3-5 emails/second (limited by process spawning)

**Parallel execution:**
- 100+ emails/second (limited by Postal and network)

**Optimization tips:**
- Use `xargs -P` for parallel sends
- Batch operations when possible
- Use persistent HTTP connections (future)

### Resource Usage

**MailGoat CLI:**
- Memory: ~30MB per process
- CPU: Negligible (I/O bound)
- Disk: Config file only (~1KB)

**Postal:**
- Memory: ~500MB-2GB (depends on volume)
- CPU: ~2-4 cores recommended
- Disk: ~20GB minimum, ~1GB per 100k messages

## Extensibility

### Future Enhancements

**Phase 2 (Planned):**
- Webhook-based inbox management
- Attachment support
- Batch sending API
- Advanced filtering

**Phase 3 (Long-term):**
- Managed SaaS offering
- Web dashboard
- Advanced automation rules
- Integration plugins

### Plugin System

Not yet implemented, but designed for:

```
~/.mailgoat/plugins/
├── mailgoat-attachments/
├── mailgoat-templates/
└── mailgoat-webhooks/
```

## See Also

- [Getting Started](getting-started.md) - Install and configure
- [Self-Hosting Guide](self-hosting.md) - Deploy Postal
- [Postal Integration](postal-integration.md) - Understanding Postal
- [Contributing](contributing.md) - Modify MailGoat code
