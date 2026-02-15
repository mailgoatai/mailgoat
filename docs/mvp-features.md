# MailGoat CLI v0.1 - MVP Feature Specification

**Product Lead:** @product-lead  
**Date:** 2026-02-15  
**Status:** Approved for Development

---

## Executive Summary

MailGoat v0.1 is the **minimum viable product** that proves the core value proposition: **agents can send and receive email via a simple CLI with zero human friction.**

**What's In:** Self-hosted CLI that talks directly to Postal, covering the essential email workflow (send, receive, read).

**What's Out:** SaaS backend, self-registration, webhooks, advanced features. These come in later releases.

**Success Criteria:** An agent can go from "I need email" to sending their first message in under 5 minutes, with clear terminal output and no browser required.

---

## 1. Scope Definition

### 1.1 In Scope (v0.1)

#### Core Email Operations
- ✅ **Send email** - to, subject, body, attachments
- ✅ **List inbox** - with filtering (unread, time range)
- ✅ **Read message** - view full message details
- ✅ **Mark as read/unread** - basic inbox management

#### CLI Interface
- ✅ **Installation** - via npm (`npm install -g mailgoat`)
- ✅ **Configuration** - via config file (`~/.mailgoat/config.yml`)
- ✅ **Structured output** - JSON mode for programmatic parsing
- ✅ **Human-readable output** - tables/formatted text for terminal use

#### Authentication
- ✅ **API key authentication** - using Postal credentials directly
- ✅ **Config management** - store/read credentials locally

#### Documentation
- ✅ **Installation guide** - npm setup + Postal prerequisite
- ✅ **Postal setup guide** - Docker deployment, DNS config, credential creation
- ✅ **CLI usage examples** - common workflows for agents
- ✅ **Troubleshooting** - common errors and fixes

### 1.2 Out of Scope (Post-v0.1)

#### Not in MVP
- ❌ **Self-registration** - manual Postal setup required (Phase 2)
- ❌ **Webhooks** - polling only for now (Phase 2)
- ❌ **SaaS backend** - direct Postal integration only (Phase 2)
- ❌ **Advanced filtering** - search, labels, folders (v0.2+)
- ❌ **Multi-account support** - single account per config (v0.2+)
- ❌ **Email templates** - plain text and HTML only, no templating (v0.3+)
- ❌ **Scheduled sends** - immediate delivery only (v0.3+)
- ❌ **Read receipts** - no tracking pixels or receipts (v0.4+)
- ❌ **Web UI** - CLI only (may never build)
- ❌ **Mobile app** - CLI only (may never build)

---

## 2. Core User Flows

### 2.1 Initial Setup Flow

**Goal:** Agent goes from zero to configured in 5 minutes.

**Precondition:** Postal instance is running (either self-hosted or provided by admin).

#### Step-by-Step Flow

```bash
# 1. Install CLI
npm install -g mailgoat

# 2. Initialize configuration
mailgoat init
# Prompts:
# - Postal server URL: https://postal.example.com
# - Email address: agent@example.com
# - API key: [paste credential from Postal UI]

# 3. Test connection
mailgoat status
# Output:
# ✓ Connected to postal.example.com
# ✓ Email: agent@example.com
# ✓ API key: valid

# 4. Send first email
mailgoat send \
  --to test@example.com \
  --subject "First message" \
  --body "Hello from MailGoat!"

# Output:
# ✓ Message sent successfully
# Message ID: abc123xyz
```

**Success Metric:** Agent can complete this flow without consulting docs (intuitive prompts).

---

### 2.2 Sending Email Flow

**Goal:** Agent sends email with minimal friction.

#### Basic Send

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "Weekly Report" \
  --body "Here's your report..."

# Output:
# ✓ Message sent successfully
# Message ID: msg_abc123
# From: agent@example.com
# To: recipient@example.com
# Subject: Weekly Report
```

#### Send with Multiple Recipients

```bash
mailgoat send \
  --to user1@example.com,user2@example.com \
  --cc manager@example.com \
  --subject "Team Update" \
  --body "Update for the team..."
```

#### Send with Attachment

```bash
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "See attached." \
  --attach report.pdf
```

#### Send HTML Email

```bash
mailgoat send \
  --to user@example.com \
  --subject "Newsletter" \
  --html newsletter.html
```

#### JSON Output (for scripting)

```bash
mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "Body" \
  --json

# Output:
# {"status":"sent","message_id":"msg_abc123","timestamp":"2026-02-15T13:00:00Z"}
```

**Edge Cases:**
- Invalid recipient email → clear error message
- Missing required fields → prompt or error
- Attachment too large → warning and fail gracefully
- Network error → retry with exponential backoff

---

### 2.3 Receiving Email Flow

**Goal:** Agent checks inbox and reads messages.

#### List All Messages

```bash
mailgoat inbox

# Output (table format):
# ID        From                  Subject              Received
# msg_001   user@example.com      Meeting today        2 hours ago
# msg_002   bot@service.com       Report ready         5 hours ago
# msg_003   admin@company.com     Access granted       1 day ago
```

#### List Unread Messages Only

```bash
mailgoat inbox --unread

# Output:
# ID        From                  Subject              Received
# msg_001   user@example.com      Meeting today        2 hours ago
```

#### Filter by Time Range

```bash
mailgoat inbox --since "24h"
mailgoat inbox --since "2026-02-14"
```

#### JSON Output

```bash
mailgoat inbox --json

# Output:
# [
#   {
#     "id": "msg_001",
#     "from": "user@example.com",
#     "subject": "Meeting today",
#     "received": "2026-02-15T11:00:00Z",
#     "unread": true
#   }
# ]
```

#### Read Specific Message

```bash
mailgoat read msg_001

# Output:
# From: user@example.com
# To: agent@example.com
# Subject: Meeting today
# Date: 2026-02-15 11:00:00 UTC
# 
# Body:
# Hey, let's meet at 3pm to discuss the project.
# 
# Attachments:
# - agenda.pdf (45 KB)
```

#### Mark as Read/Unread

```bash
mailgoat mark-read msg_001
mailgoat mark-unread msg_001
```

**Edge Cases:**
- Empty inbox → friendly message ("No messages")
- Invalid message ID → clear error
- Network timeout → retry with backoff

---

### 2.4 Polling for New Messages (v0.1 Only)

**Goal:** Agent periodically checks for new email.

**Note:** Webhooks are post-MVP. For v0.1, agents poll manually.

#### Manual Polling

```bash
# Agent runs this in a loop
while true; do
  NEW_MSGS=$(mailgoat inbox --unread --json | jq length)
  if [ "$NEW_MSGS" -gt 0 ]; then
    echo "You have $NEW_MSGS new messages"
    mailgoat inbox --unread
  fi
  sleep 60
done
```

#### Built-in Poll Command (Nice-to-have for v0.1)

```bash
mailgoat poll --interval 60s --command "echo 'New mail arrived'"

# This blocks and runs the command whenever new mail arrives
```

**Post-MVP:** Webhooks replace polling for efficiency.

---

## 3. Technical Requirements

### 3.1 CLI Architecture

**Language:** Node.js (TypeScript)

**Distribution:** npm package (`mailgoat`)

**Dependencies:**
- HTTP client (axios or fetch)
- CLI framework (commander.js or yargs)
- Config management (cosmiconfig)
- Table rendering (cli-table3)
- JSON parsing (built-in)

**Entry Point:**
```
/usr/local/bin/mailgoat → npm global bin
```

### 3.2 Configuration File

**Location:** `~/.mailgoat/config.yml`

**Schema:**
```yaml
server: https://postal.example.com
email: agent@example.com
api_key: postal_api_credential_here

# Optional settings
default_from: agent@example.com  # If different from email
output_format: table            # or json
timeout: 30                      # API timeout in seconds
```

**Precedence:**
1. Command-line flags (highest)
2. Environment variables (`MAILGOAT_API_KEY`, etc.)
3. Config file
4. Interactive prompts (if missing)

### 3.3 Postal API Integration

**Endpoints Used:**

| MailGoat Command | Postal API Endpoint |
|-----------------|---------------------|
| `mailgoat send` | `POST /api/v1/send/message` |
| `mailgoat inbox` | `POST /api/v1/messages/list` (if exists) or query endpoint |
| `mailgoat read <id>` | `POST /api/v1/messages/message?id=<id>` |

**Authentication:**
- Include Postal API key in request headers
- Use Postal's credential system directly

**Error Handling:**
- 401 Unauthorized → "Invalid API key. Run `mailgoat init` to reconfigure."
- 404 Not Found → "Message not found."
- 500 Server Error → "Postal server error. Check Postal logs."
- Network timeout → Retry with exponential backoff (3 attempts)

### 3.4 Output Formats

#### Human-Readable (Default)

```
✓ Message sent successfully
Message ID: msg_abc123
From: agent@example.com
To: user@example.com
Subject: Weekly Report
```

#### JSON Mode (`--json` flag)

```json
{
  "status": "sent",
  "message_id": "msg_abc123",
  "from": "agent@example.com",
  "to": ["user@example.com"],
  "subject": "Weekly Report",
  "timestamp": "2026-02-15T13:00:00Z"
}
```

**Rationale:** JSON mode enables scripting and integration with agent frameworks.

---

## 4. Command Reference

### 4.1 `mailgoat init`

**Purpose:** Initialize or reconfigure MailGoat.

**Usage:**
```bash
mailgoat init [--server <url>] [--email <email>] [--api-key <key>]
```

**Behavior:**
- Interactive prompts if flags omitted
- Writes to `~/.mailgoat/config.yml`
- Tests connection to Postal

**Example:**
```bash
mailgoat init
# Prompts:
# Postal server URL: https://postal.example.com
# Email address: agent@example.com
# API key: *****
# ✓ Configuration saved and tested
```

---

### 4.2 `mailgoat status`

**Purpose:** Check connection and configuration.

**Usage:**
```bash
mailgoat status [--json]
```

**Output:**
```
✓ Connected to postal.example.com
✓ Email: agent@example.com
✓ API key: valid
```

**JSON Output:**
```json
{
  "server": "postal.example.com",
  "email": "agent@example.com",
  "api_key_valid": true,
  "connection": "ok"
}
```

---

### 4.3 `mailgoat send`

**Purpose:** Send an email.

**Usage:**
```bash
mailgoat send \
  --to <email> \
  [--cc <email>] \
  [--bcc <email>] \
  --subject <subject> \
  [--body <text>] \
  [--html <file>] \
  [--attach <file>] \
  [--from <email>] \
  [--json]
```

**Required:**
- `--to`: Recipient email (comma-separated for multiple)
- `--subject`: Email subject

**Optional:**
- `--body`: Plain text body (or read from stdin)
- `--html`: HTML body from file
- `--attach`: Attachment file path (repeatable)
- `--from`: Sender email (default: config.email)
- `--json`: JSON output

**Examples:**
```bash
# Basic send
mailgoat send --to user@example.com --subject "Hi" --body "Hello"

# HTML email
mailgoat send --to user@example.com --subject "Newsletter" --html newsletter.html

# With attachment
mailgoat send --to user@example.com --subject "Report" --body "See attached" --attach report.pdf

# Multiple recipients
mailgoat send --to "user1@example.com,user2@example.com" --subject "Update" --body "..."

# Read body from stdin
echo "Body text" | mailgoat send --to user@example.com --subject "Test"
```

---

### 4.4 `mailgoat inbox`

**Purpose:** List received messages.

**Usage:**
```bash
mailgoat inbox \
  [--unread] \
  [--since <time>] \
  [--limit <n>] \
  [--json]
```

**Optional:**
- `--unread`: Show only unread messages
- `--since`: Filter by time (e.g., "24h", "1w", "2026-02-14")
- `--limit`: Max messages to show (default: 50)
- `--json`: JSON output

**Examples:**
```bash
# All messages
mailgoat inbox

# Unread only
mailgoat inbox --unread

# Last 24 hours
mailgoat inbox --since 24h

# JSON output
mailgoat inbox --json
```

---

### 4.5 `mailgoat read`

**Purpose:** Read a specific message.

**Usage:**
```bash
mailgoat read <message-id> [--json]
```

**Output:**
```
From: user@example.com
To: agent@example.com
Subject: Meeting today
Date: 2026-02-15 11:00:00 UTC
Unread: yes

Body:
Let's meet at 3pm to discuss the project.

Attachments:
- agenda.pdf (45 KB)
```

**JSON Output:**
```json
{
  "id": "msg_001",
  "from": "user@example.com",
  "to": "agent@example.com",
  "subject": "Meeting today",
  "date": "2026-02-15T11:00:00Z",
  "unread": true,
  "body": "Let's meet at 3pm...",
  "attachments": [
    {"name": "agenda.pdf", "size": 46080}
  ]
}
```

---

### 4.6 `mailgoat mark-read` / `mailgoat mark-unread`

**Purpose:** Mark message as read or unread.

**Usage:**
```bash
mailgoat mark-read <message-id>
mailgoat mark-unread <message-id>
```

**Output:**
```
✓ Message msg_001 marked as read
```

---

## 5. Documentation Requirements

### 5.1 README.md (for npm package)

**Sections:**
1. **What is MailGoat?** - Elevator pitch
2. **Installation** - `npm install -g mailgoat`
3. **Prerequisites** - Postal instance required
4. **Quick Start** - 5-minute setup flow
5. **Usage Examples** - Send, receive, read
6. **Configuration** - Config file reference
7. **Troubleshooting** - Common errors
8. **Contributing** - Link to GitHub
9. **License** - MIT

### 5.2 Postal Setup Guide (`docs/postal-setup.md`)

**Sections:**
1. **What is Postal?** - Brief explanation
2. **Installation via Docker** - Docker Compose example
3. **DNS Configuration** - MX, SPF, DKIM, DMARC
4. **Creating an Organization & Server** - Postal UI walkthrough
5. **Generating API Credentials** - For MailGoat
6. **Testing** - Send a test email via Postal UI
7. **Troubleshooting** - Common DNS/SMTP issues

**Goal:** A competent dev can self-host Postal in 30 minutes.

### 5.3 CLI Usage Guide (`docs/cli-usage.md`)

**Sections:**
1. **Installation**
2. **Configuration** - `mailgoat init`
3. **Sending Email** - Examples for all use cases
4. **Receiving Email** - Inbox, read, mark as read
5. **Scripting** - JSON mode, loops, agent integration
6. **OpenClaw Integration** - Skill installation

---

## 6. Non-Functional Requirements

### 6.1 Performance

- **Send latency:** < 2 seconds (CLI → Postal API → queued)
- **Inbox fetch:** < 3 seconds for 50 messages
- **Attachment upload:** Support up to 25 MB (Postal's limit)

### 6.2 Reliability

- **Retry logic:** 3 attempts with exponential backoff for network errors
- **Timeout:** 30 seconds default (configurable)
- **Graceful degradation:** If Postal is down, show clear error (not crash)

### 6.3 Usability

- **Error messages:** Human-readable, actionable (e.g., "API key invalid. Run `mailgoat init` to fix.")
- **Help text:** Every command has `--help` flag
- **Defaults:** Sensible defaults (table output, 50 message limit, etc.)

### 6.4 Security

- **Credential storage:** `~/.mailgoat/config.yml` with mode 600 (user-only read/write)
- **No plaintext logs:** Never log API keys
- **TLS:** All Postal API calls over HTTPS

---

## 7. Testing Requirements

### 7.1 Unit Tests

- CLI argument parsing
- Config file loading
- API request formatting
- Error handling logic

**Tool:** Jest or Mocha

### 7.2 Integration Tests

- End-to-end send flow (CLI → Postal → email delivered)
- End-to-end receive flow (Postal → CLI inbox)
- Authentication failure scenarios
- Network timeout handling

**Tool:** Integration test suite with a test Postal instance

### 7.3 Agent Testing

- **OpenClaw agent:** Install skill, send/receive email
- **Other frameworks:** Test with Aider, Cursor, etc.
- **Feedback:** Collect UX feedback from agents

---

## 8. Success Metrics

### 8.1 MVP Success Criteria

✅ **Installation:** Agent installs via `npm install -g mailgoat` in < 30 seconds  
✅ **Configuration:** Agent completes `mailgoat init` in < 5 minutes  
✅ **Send:** Agent sends first email successfully without docs  
✅ **Receive:** Agent lists and reads inbox successfully  
✅ **Reliability:** 99% success rate for send/receive (excluding Postal issues)  

### 8.2 Developer Feedback

- **Ease of use:** 8/10 or higher
- **Documentation clarity:** 8/10 or higher
- **Would recommend:** 80%+ say "yes"

---

## 9. Release Plan

### 9.1 Alpha Release (Internal Testing)

**Timeline:** Week 1-2

**Audience:** OpenGoat agents only

**Goals:**
- Validate core workflows
- Identify breaking bugs
- Gather UX feedback

### 9.2 Beta Release (Public)

**Timeline:** Week 3-4

**Audience:** Early adopters, agent developers

**Goals:**
- Collect feedback from diverse agent frameworks
- Test with various Postal configurations
- Finalize documentation

### 9.3 v0.1 Release (Stable)

**Timeline:** Week 5

**Audience:** General public

**Goals:**
- Publish to npm
- Announce on GitHub, Discord, social media
- Monitor adoption and issues

---

## 10. Post-MVP Roadmap

### v0.2 - Webhooks & Notifications
- Real-time push notifications via webhooks
- `mailgoat notify --webhook <url>` command
- Polling becomes optional

### v0.3 - Advanced Features
- Search and filtering (by sender, subject, keywords)
- Email templates
- Scheduled sends
- Multi-account support

### v0.4 - SaaS Backend
- Self-registration flow (`mailgoat register`)
- MailGoat backend service
- Managed Postal instances
- Usage-based billing

### v1.0 - Production-Ready
- Enterprise features (SSO, audit logs, compliance)
- 99.9% SLA for SaaS
- Premium support tier

---

## 11. Open Questions

1. **Attachment handling:** Should we support inline attachments (e.g., for HTML images)?
2. **Polling frequency:** What's the recommended polling interval for agents? 60s? 5m?
3. **Backward compatibility:** How do we version the CLI to avoid breaking changes?
4. **Local caching:** Should CLI cache messages locally to reduce Postal API calls?

---

## 12. Conclusion

MailGoat v0.1 delivers the **core promise**: agents can send and receive email via a simple CLI with zero friction.

By focusing on the essential workflows (send, receive, read) and deferring advanced features (webhooks, self-registration, SaaS), we ship a usable product quickly while validating the core value proposition.

**Engineering can start building immediately** from this spec. All core user flows, technical requirements, and success criteria are defined.

---

**Prepared by:** @product-lead  
**Reviewed by:** —  
**Approved by:** —  
**Next Step:** Engineering kickoff
