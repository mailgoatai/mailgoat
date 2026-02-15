# Architecture Overview

High-level technical architecture for MailGoat.

---

## System Architecture (MVP)

```
┌─────────────────┐
│   AI Agent      │
│  (OpenClaw,     │
│   Python, etc.) │
└────────┬────────┘
         │
         │ (executes CLI)
         ▼
┌─────────────────┐
│  MailGoat CLI   │
│  (Node.js)      │
│                 │
│  - send         │
│  - read         │
│  - config       │
└────────┬────────┘
         │
         │ HTTP API
         │ (API Key Auth)
         ▼
┌─────────────────┐
│     Postal      │
│  (Mail Server)  │
│                 │
│  - SMTP         │
│  - Message API  │
│  - Deliverability│
└────────┬────────┘
         │
         │ SMTP
         ▼
┌─────────────────┐
│  External Mail  │
│   Providers     │
│  (Gmail, etc.)  │
└─────────────────┘
```

---

## Data Flow: Sending Email

```
1. Agent calls: mailgoat send --to user@example.com --subject "Hi" --body "Hello"
   ↓
2. CLI loads config (~/.mailgoat/config.yml)
   ↓
3. CLI makes HTTP POST to Postal API
   POST /api/v1/send/message
   Authorization: <api-key>
   Body: { to, subject, body, from }
   ↓
4. Postal validates, queues, sends via SMTP
   ↓
5. External mail server receives
   ↓
6. CLI returns success/failure to agent
```

---

## Data Flow: Reading Email

```
1. Agent calls: mailgoat read <message-id>
   ↓
2. CLI loads config
   ↓
3. CLI makes HTTP POST to Postal API
   POST /api/v1/messages/message
   Body: { id: <message-id> }
   ↓
4. Postal retrieves message from database
   ↓
5. CLI formats output (human or --json)
   ↓
6. Agent receives email content
```

**Note:** Inbox listing (list all messages) is not yet supported due to Postal API limitations. Workaround in progress (webhooks + cache or custom endpoint).

---

## Configuration

### Config File: `~/.mailgoat/config.yml`

```yaml
server: postal.example.com
email: agent@example.com
api_key: <credential>
```

### Environment Variables (Future)
- `MAILGOAT_SERVER`
- `MAILGOAT_API_KEY`
- `MAILGOAT_EMAIL`

---

## CLI Architecture

```
mailgoat (bin/mailgoat.js)
│
├── src/index.ts (Commander.js entry point)
│
├── src/commands/
│   ├── send.ts      (Send email command)
│   ├── read.ts      (Read email command)
│   ├── inbox.ts     (List emails - stub)
│   └── config.ts    (Manage config)
│
├── src/lib/
│   ├── config.ts         (Config file management)
│   ├── postal-client.ts  (Postal API wrapper)
│   └── formatter.ts      (Output formatting)
│
└── dist/ (compiled JS)
```

---

## Key Architectural Decisions

### ADR-001: Use Postal as Dependency
**Decision:** Use Postal for mail infrastructure instead of building our own or forking.

**Why:**
- Mature, well-maintained, MIT licensed
- Handles deliverability (SPF, DKIM, DMARC)
- Focus our effort on agent UX, not mail servers

**Trade-offs:**
- ✅ Faster to market, lower maintenance
- ✅ Proven infrastructure
- ❌ Dependent on Postal's API and maintenance
- ❌ Inbox listing limitation (working around it)

See: `/home/node/.opengoat/organization/docs/architecture-decisions.md`

---

### ADR-002: CLI-First Design
**Decision:** Build CLI before web UI or API-only service.

**Why:**
- Agents live in terminals, not browsers
- CLI is scriptable and composable
- Lower friction than OAuth flows

**Trade-offs:**
- ✅ Agent-native experience
- ✅ Simple to use and integrate
- ❌ Less discoverable for non-technical users (not our target)

---

### ADR-003: TypeScript / Node.js for CLI
**Decision:** Use TypeScript and Node.js for the CLI.

**Why:**
- Ubiquitous in agent ecosystems
- npm distribution is simple
- Fast iteration, good libraries

**Alternatives considered:**
- Go: Harder to iterate, but good for backend later
- Python: Less common in agent tooling, packaging is messier
- Rust: Overkill for CLI, better for performance-critical parts

---

## Future Architecture (Phase 3: SaaS)

```
┌─────────────────┐
│   AI Agent      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MailGoat CLI   │
│                 │
│  Mode: managed  │
└────────┬────────┘
         │
         │ (HTTPS)
         ▼
┌─────────────────┐
│  MailGoat       │
│  Backend API    │
│                 │
│  - Auth         │
│  - Provisioning │
│  - Rate Limiting│
│  - Billing      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Postal      │
│  (Managed)      │
└─────────────────┘
```

**Key Changes:**
- CLI can operate in `managed` mode (→ Backend → Postal) or `self-hosted` mode (→ Postal directly)
- Backend handles account provisioning, auth, rate limiting, billing
- Postal remains the mail infrastructure
- Self-hosted users continue using direct mode

---

## Security Architecture

### Authentication
- **Current:** API key from Postal (user-managed)
- **Future (SaaS):** MailGoat-issued API keys, scoped permissions

### Secrets
- **Config storage:** `~/.mailgoat/config.yml` (mode 0600)
- **Transmission:** HTTPS only
- **Never log:** API keys, passwords, email content (only metadata)

### Deliverability
- Postal handles SPF, DKIM, DMARC
- Self-hosters must configure DNS correctly
- Managed service (future) will handle this automatically

---

## Performance Considerations

### Targets
- CLI startup: < 2 seconds
- Send email: < 5 seconds
- Read email: < 3 seconds

### Bottlenecks
- Network latency (Postal API calls)
- DNS resolution (for self-hosters)
- Node.js startup time (acceptable for CLI)

### Optimizations (Future)
- Cache Postal server info
- Persistent HTTP connections
- Batch operations

---

## Testing Strategy

### Unit Tests
- Config management
- Output formatting
- Command parsing

### Integration Tests
- CLI → Postal API (requires test Postal instance)
- See: `tests/test-runner.sh` and `tests/test-scenarios.md`

### Manual QA
- See: `docs/qa-test-plan.md`
- Focus: UX, documentation, error handling

---

## Scalability

### MVP (Self-Hosted)
- Single Postal instance
- 1000s of emails/day
- Suitable for individual agents or small teams

### Phase 3 (Managed SaaS)
- Multi-tenant Postal infrastructure
- Horizontal scaling (multiple Postal instances)
- Load balancing, monitoring, auto-scaling
- Target: millions of emails/day

---

## Detailed Architecture Docs

See: `/home/node/.opengoat/organization/docs/architecture-spike.md`

---

_Last updated: 2026-02-15_
