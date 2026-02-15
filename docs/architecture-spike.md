# MailGoat Architecture Spike

**Lead Engineer:** @lead-engineer  
**Date:** 2026-02-15  
**Status:** Proposed

## Executive Summary

**Recommendation:** Build MailGoat as a lightweight CLI wrapper around Postal's HTTP API with an agent-first interface and simplified self-registration flow.

**Key Decision:** Use Postal as a dependency (not a fork), letting them handle mail infrastructure while we focus on agent UX.

---

## 1. Context

MailGoat is a CLI-first email provider designed specifically for AI agents. We're starting as an MIT-licensed open-source project with a path to SaaS.

**Core Requirements:**
- **CLI-first:** Agents interact via terminal commands, not web UIs
- **Self-registration:** Agents can autonomously create email accounts
- **Self-hostable:** Must be easy to run on your own infrastructure
- **SaaS-ready:** Architecture should scale to hosted service

**CEO Decision (from worklog):**
- Use Postal (https://github.com/postalserver/postal) as our mail infrastructure
- Build a thin layer on top for agent-specific features
- Let Postal handle the hard parts (SMTP, deliverability, DNS, spam filtering)

---

## 2. Postal Analysis

### What Postal Provides

**Postal** is an MIT-licensed, self-hosted mail delivery platform (think Sendgrid/Mailgun but open source).

**Key Features:**
- Full mail server (sending + receiving)
- Web UI for management
- HTTP API for programmatic access
- Webhook support for delivery events
- IP pools for reputation management
- Spam/antivirus integration (SpamAssassin, ClamAV)
- Docker-based deployment
- Active community and maintenance

### Postal's HTTP API

Postal exposes a "Legacy API" (their term, but it's the current API) with these core endpoints:

**Sending Mail:**
```
POST /api/v1/send/message
- to, cc, bcc: email arrays
- from: sender email
- subject, plain_body, html_body
- attachments (base64)
- custom_headers, tags
```

**Retrieving Messages:**
```
POST /api/v1/messages/message?id=<message_id>
- Returns message details, status, headers, body
- Supports expansions: status, details, inspection, attachments, raw_message
```

**Authentication:**
- API credentials (per mail server)
- Credentials have server-level permissions

### What Postal Doesn't Provide

- **No CLI interface** - it's web UI + HTTP API only
- **No agent-optimized workflow** - designed for human web interaction
- **No self-registration flow** - admins create accounts manually
- **No agent-specific features** - notifications, structured responses, etc.

---

## 3. Proposed Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   MailGoat CLI                       │
│  (Node.js/Python/Go - agent-facing interface)       │
│                                                      │
│  Commands:                                           │
│  - mailgoat register                                 │
│  - mailgoat send <to> <subject> <body>              │
│  - mailgoat inbox [--unread]                         │
│  - mailgoat read <message-id>                        │
│  - mailgoat notify --webhook <url>                   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP API calls
                   ▼
┌─────────────────────────────────────────────────────┐
│              MailGoat Backend Service                │
│  (Thin orchestration layer - optional for SaaS)     │
│                                                      │
│  - Self-registration workflow                        │
│  - Credential management                             │
│  - Agent-specific abstractions                       │
│  - Rate limiting / quotas (for SaaS)                 │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP API
                   ▼
┌─────────────────────────────────────────────────────┐
│                  Postal Instance                     │
│  (Self-hosted or managed - mail infrastructure)     │
│                                                      │
│  - SMTP server (sending/receiving)                   │
│  - Message storage                                   │
│  - Webhook delivery                                  │
│  - Spam/virus scanning                               │
│  - Web UI (for debugging/management)                 │
└─────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### MailGoat CLI (Core Innovation)

**Language:** Node.js (for npm distribution) or Go (single binary)

**Purpose:** Agent-facing interface that abstracts Postal's API into simple commands.

**Key Commands:**
```bash
# First-time setup (self-registration)
mailgoat register --email agent@example.com --server postal.example.com

# Sending
mailgoat send \
  --to user@example.com \
  --subject "Hello" \
  --body "Message body" \
  --from agent@example.com

# Receiving
mailgoat inbox               # List messages
mailgoat read <message-id>   # Read specific message
mailgoat inbox --unread      # Only unread
mailgoat inbox --since "1h"  # Time filter

# Notifications
mailgoat notify --webhook https://agent.local/mail
mailgoat notify --poll 30s   # Polling mode
```

**Configuration:**
```yaml
# ~/.mailgoat/config.yml
server: postal.example.com
email: agent@example.com
api_key: <credential>
```

**Features:**
- Simple, composable CLI for scripting
- JSON output mode for programmatic parsing
- Webhook setup for push notifications
- Local config management

#### MailGoat Backend (Optional Layer)

**Purpose:** Orchestration service that sits between CLI and Postal. Required for SaaS, optional for self-hosted.

**Responsibilities:**
- **Self-registration:** Create Postal organizations, servers, and credentials programmatically
- **Credential management:** Issue API keys, rotate secrets
- **Rate limiting:** Prevent abuse in shared/SaaS deployments
- **Agent abstractions:** Simplified models that map to Postal's API
- **Billing integration:** (SaaS only) Usage tracking and metering

**Implementation:**
- Language: Node.js (TypeScript) or Go
- API: REST or gRPC
- Database: PostgreSQL (for credential storage, usage logs)
- Deployment: Docker container, scales horizontally

**Why Optional?**
For self-hosted users who just want simplicity, the CLI can talk directly to Postal's API. The backend layer is only needed for:
- Multi-tenant SaaS deployments
- Self-registration automation (can be CLI-only for simple cases)
- Advanced features (quotas, billing, analytics)

#### Postal (Dependency)

**Purpose:** The actual mail infrastructure.

**Deployment Options:**
- **Self-hosted:** User runs Postal via Docker
- **Managed by MailGoat:** We host Postal instances for SaaS customers

**Interface:** We interact only via Postal's HTTP API, never modifying Postal's code.

---

## 4. Architecture Options

### Option A: CLI → Postal (Direct)

**Description:** CLI talks directly to Postal's API. No middleware layer.

**Pros:**
- Simplest architecture
- Lowest latency
- Minimal infrastructure
- Perfect for self-hosted users
- Easy to understand and debug

**Cons:**
- No self-registration (manual setup via Postal UI)
- No SaaS path without adding backend later
- Every agent needs direct Postal API credentials
- Limited abstraction (agents see Postal's API structure)

**Best For:** MVP, self-hosted users, testing

---

### Option B: CLI → MailGoat Backend → Postal (Thin Layer)

**Description:** MailGoat backend provides a simplified API and self-registration, then proxies to Postal.

**Pros:**
- Self-registration workflow
- Agent-friendly API abstractions
- Clear SaaS path
- Centralized credential management
- Rate limiting and quotas

**Cons:**
- Extra infrastructure to run/maintain
- Additional latency (backend hop)
- More complex deployment

**Best For:** SaaS offering, multi-tenant deployments

---

### Option C: Hybrid (Smart CLI)

**Description:** CLI can operate in both modes:
- **Direct mode:** Talk to Postal API directly (self-hosted)
- **Managed mode:** Talk to MailGoat backend (SaaS)

**Pros:**
- Best of both worlds
- Self-hosted users get simplicity
- SaaS users get managed experience
- Same CLI for both use cases

**Cons:**
- CLI complexity (two modes to maintain)
- Configuration switching

**Best For:** Open-source + SaaS strategy

---

## 5. Recommendation

**Go with Option C: Hybrid Architecture**

### Rationale

1. **Open-source first:** Self-hosted users get a simple CLI → Postal flow
2. **SaaS ready:** Backend layer exists for managed offering
3. **One codebase:** CLI works in both modes
4. **Gradual adoption:** Users can start self-hosted, migrate to SaaS later

### MVP Scope (Phase 1)

**Direct Mode Only:**
- Build CLI that talks to Postal API
- Focus on core commands: send, inbox, read
- Document Postal setup for self-hosting
- No backend service yet

**Why:** Validate agent UX before building backend infrastructure.

### SaaS Expansion (Phase 2)

**Add Backend Service:**
- Self-registration API
- Credential management
- MailGoat-hosted Postal instances
- CLI switches to "managed mode"

---

## 6. Technical Decisions

### CLI Language: Node.js vs. Go

**Recommendation: Node.js (TypeScript)**

**Rationale:**
- **npm distribution:** Agents already use npm for dependencies
- **Faster iteration:** TypeScript + rich ecosystem
- **Postal API clients:** Easier to build HTTP clients in JS
- **Agent context:** Most AI agent frameworks are JS/Python

**Trade-off:** Go would give us a single binary, but agent environments already have Node.js.

### Authentication Strategy

**For Direct Mode (CLI → Postal):**
- Use Postal's credential system directly
- Store API key in `~/.mailgoat/config.yml`
- User creates credentials via Postal UI

**For Managed Mode (CLI → Backend → Postal):**
- Backend issues MailGoat API keys
- Backend manages Postal credentials internally
- CLI stores MailGoat key (not Postal key)

### Self-Registration Flow (Phase 2)

```
1. Agent runs: mailgoat register --email agent@domain.com
2. CLI calls: POST /register to MailGoat backend
3. Backend:
   - Creates Postal organization (if new domain)
   - Creates Postal server for agent
   - Generates API credential
   - Returns MailGoat API key to CLI
4. CLI saves API key locally
5. Agent can now send/receive mail
```

**Key Insight:** Backend automates what admins do manually in Postal UI.

---

## 7. Data Flow Examples

### Sending an Email (Direct Mode)

```
Agent: mailgoat send --to user@example.com --subject "Hi" --body "Test"

CLI:
  1. Read ~/.mailgoat/config.yml (get API key, server)
  2. POST https://postal.example.com/api/v1/send/message
     {
       "to": ["user@example.com"],
       "from": "agent@example.com",
       "subject": "Hi",
       "plain_body": "Test"
     }
  3. Return message_id to agent

Postal:
  1. Queue message for delivery
  2. SMTP send to recipient
  3. Log delivery status
  4. Trigger webhooks (if configured)
```

### Reading Inbox (Direct Mode)

```
Agent: mailgoat inbox --unread

CLI:
  1. Call Postal API to list messages
  2. Filter by unread status
  3. Format output as table or JSON
  4. Return to agent
```

---

## 8. Infrastructure Requirements

### For Self-Hosted Users

**What they run:**
- Postal instance (Docker Compose)
- DNS configuration (MX, SPF, DKIM)

**What we provide:**
- MailGoat CLI (npm package)
- Setup documentation
- Example configurations

### For SaaS Users

**What we run:**
- MailGoat backend service
- Postal instances (multi-tenant or per-customer)
- Webhook infrastructure
- DNS management

**What we provide:**
- Hosted endpoint (e.g., api.mailgoat.dev)
- Managed Postal infrastructure
- Dashboard for usage/billing

---

## 9. Security Considerations

### Credential Storage

- **CLI:** Store API keys in `~/.mailgoat/config.yml` (mode 600)
- **Backend:** Encrypted at rest (PostgreSQL + application-level encryption)

### API Authentication

- **Direct mode:** Postal API keys (existing mechanism)
- **Managed mode:** JWT or API key with rotation support

### Email Security

- **Spam filtering:** Delegated to Postal (SpamAssassin/rspamd)
- **Virus scanning:** Delegated to Postal (ClamAV)
- **TLS:** Postal handles SMTP TLS

---

## 10. Open Questions

1. **Webhooks vs. Polling:**
   - Should CLI default to polling or require webhook setup?
   - Polling is simpler but less efficient

2. **Multi-account support:**
   - Should CLI support multiple email accounts per agent?
   - Use case: agent manages multiple personas

3. **Message storage:**
   - Rely entirely on Postal's storage?
   - Or provide local caching in CLI?

4. **API versioning:**
   - How do we version MailGoat API independently of Postal?

---

## 11. Next Steps

### Immediate (MVP):

1. **Prototype CLI** (Developer 1)
   - Core commands: send, inbox, read
   - Direct Postal API integration
   - JSON output mode

2. **Document Postal setup** (Developer 2)
   - Docker Compose example
   - DNS configuration guide
   - Credential creation walkthrough

3. **Test with real agents** (QA)
   - OpenClaw integration
   - Aider, Cursor, other agent frameworks
   - Gather UX feedback

### Phase 2 (SaaS):

1. **Build backend service** (Developer 3)
   - Self-registration API
   - Credential management
   - Postal orchestration

2. **CLI managed mode** (Developer 1)
   - Backend API client
   - Mode switching (direct vs. managed)

3. **Hosting infrastructure** (Ops - TBD)
   - Deploy Postal for customers
   - Webhook relay service
   - Monitoring and alerting

---

## 12. Success Metrics

**MVP Success:**
- ✅ Agent can send email via CLI in < 5 commands
- ✅ Agent can read inbox via CLI
- ✅ Self-hosting guide takes < 30 minutes to follow
- ✅ CLI has 0 dependencies on our infrastructure

**SaaS Success:**
- ✅ Self-registration flow takes < 2 minutes
- ✅ 99.9% uptime for managed service
- ✅ Email delivery within 30 seconds
- ✅ Cost per agent < $5/month

---

## 13. Conclusion

By building MailGoat as a thin, agent-first CLI layer on top of Postal, we:

1. **De-risk infrastructure** - Postal handles the hard parts
2. **Focus on UX** - Make email easy for agents
3. **Enable self-hosting** - MIT license, no vendor lock-in
4. **Path to SaaS** - Backend layer scales when needed
5. **Leverage existing tools** - Don't reinvent mail servers

**This architecture balances simplicity (MVP) with scalability (SaaS), making MailGoat valuable in both open-source and commercial contexts.**

---

**Prepared by:** @lead-engineer  
**Reviewed by:** —  
**Approved by:** —
