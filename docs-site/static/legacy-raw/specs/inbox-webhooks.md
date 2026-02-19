# Feature Spec: Inbox Listing via Webhooks

**Feature:** Webhook-based message delivery with local caching  
**Priority:** P0 (Critical)  
**Owner:** Developer 3  
**Status:** Spec Complete, Ready for Implementation  
**Target Release:** v0.2.0  
**Estimated Effort:** 8-12 hours

---

## Problem Statement

**Current State:**  
Users cannot list their inbox because Postal's Legacy API lacks a `/messages/list` endpoint. The `mailgoat inbox` command exists but returns an empty array or error.

**User Pain:**  
This breaks a core use case: "Check my email as an agent." Users can send emails but can't easily see what they've received, forcing them to:

- Use Postal's web UI (requires browser, breaks CLI-first promise)
- Query Postal database directly (requires database access, not feasible for managed Postal)
- Poll individual message IDs (requires knowing IDs in advance)

**Impact:**

- HIGH user frustration
- Product promise not delivered
- Competitive disadvantage vs. traditional email providers
- Support burden (users will complain immediately)

**Success Metric:**  
Users can run `mailgoat inbox` and see their messages within 5 seconds.

---

## Proposed Solution

### High-Level Approach

Implement **webhook-based message delivery** where Postal sends new messages to a user-specified webhook URL. Messages are cached locally in `~/.mailgoat/inbox/`, enabling instant inbox listing.

### Architecture

```
┌─────────────┐
│   Postal    │
│   Server    │
└──────┬──────┘
       │ HTTP POST (webhook)
       │ {message: {...}}
       ▼
┌─────────────────┐
│  Webhook Server │ (user-hosted)
│  or ngrok/etc   │
└──────┬──────────┘
       │ Store message
       ▼
┌─────────────────┐
│  Local Cache    │
│  ~/.mailgoat/   │
│     inbox/      │
│  - messages.db  │ (SQLite metadata)
│  - msg_*.json   │ (message content)
└─────────────────┘
       ▲
       │ Read from cache
       │
┌──────┴──────┐
│ mailgoat    │
│  inbox      │
└─────────────┘
```

### Components

**1. Webhook Setup Commands**

```bash
mailgoat webhook add <url>         # Register webhook with Postal
mailgoat webhook list              # List configured webhooks
mailgoat webhook remove <id>       # Remove webhook
mailgoat webhook test <url>        # Send test message
```

**2. Local Message Cache**

- **Storage:** `~/.mailgoat/inbox/`
  - `messages.db` - SQLite database for metadata
  - `msg_<id>.json` - Full message content (one file per message)
- **Schema:**
  ```sql
  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT,
    received_at INTEGER NOT NULL,  -- Unix timestamp
    read BOOLEAN DEFAULT 0,
    has_attachment BOOLEAN DEFAULT 0,
    size INTEGER,
    tag TEXT,
    INDEXED ON (from_email, to_email, received_at, read)
  );
  ```

**3. Inbox Command Updates**

```bash
mailgoat inbox                     # List all cached messages
mailgoat inbox --unread            # Filter unread only
mailgoat inbox --since 24h         # Time-based filter
mailgoat inbox --from user@ex.com  # Sender filter
mailgoat inbox --limit 50          # Limit results
mailgoat inbox --sync              # Force sync from Postal (if API available)
mailgoat inbox --json              # JSON output
```

**4. Background Sync (Optional)**

```bash
mailgoat inbox --daemon            # Run as background daemon
mailgoat inbox --daemon --stop     # Stop daemon
mailgoat inbox --daemon --status   # Check daemon status
```

---

## User Experience

### Setup Workflow

**Step 1: Configure Webhook**

```bash
$ mailgoat webhook add https://agent.example.com/inbox

Configuring webhook with Postal...

✓ Webhook created successfully
  ID: webhook_abc123
  URL: https://agent.example.com/inbox
  Status: active

Next steps:
1. Ensure your webhook endpoint is accessible
2. Test with: mailgoat webhook test https://agent.example.com/inbox
3. Send a test email to verify delivery
```

**Step 2: Test Webhook**

```bash
$ mailgoat webhook test https://agent.example.com/inbox

Testing webhook delivery...

✓ Webhook is reachable
✓ Returns 200 OK
✓ Accepts POST requests
✓ Content-Type: application/json supported

Your webhook is configured correctly!
```

**Step 3: Receive Email**

```
[User sends email to agent@example.com]
[Postal delivers to webhook]
[Message automatically cached]
```

**Step 4: List Inbox**

```bash
$ mailgoat inbox

ID           From                   Subject                  Received
msg_001      user@example.com       Meeting today            2 hours ago
msg_002      bot@service.com        Report ready             5 hours ago
msg_003      admin@company.com      Access granted           1 day ago

3 messages (1 unread)
```

### Read Command Integration

```bash
$ mailgoat read msg_001

From: user@example.com
To: agent@example.com
Subject: Meeting today
Date: 2026-02-16 10:00:00 UTC
Status: Unread → Read

Body:
Hey, let's meet at 3pm to discuss the project.

Attachments:
- agenda.pdf (45 KB)

[Message automatically marked as read in cache]
```

### Filtering Examples

```bash
# Unread only
$ mailgoat inbox --unread
1 message

# Last 24 hours
$ mailgoat inbox --since 24h
5 messages

# From specific sender
$ mailgoat inbox --from user@example.com
2 messages

# With attachments
$ mailgoat inbox --has-attachment
3 messages
```

---

## Technical Approach

### Phase 1: Webhook Registration (2 hours)

**Implementation:**

1. Add `src/commands/webhook.ts`
2. Use Postal API: `POST /api/v1/webhooks`
3. Store webhook config in `~/.mailgoat/webhooks.json`
4. Add CRUD operations (add, list, remove)

**API Integration:**

```typescript
interface WebhookConfig {
  id: string;
  url: string;
  events: string[]; // ['MessageDelivery']
  enabled: boolean;
}

async function addWebhook(url: string): Promise<WebhookConfig> {
  const response = await postalClient.post('/api/v1/webhooks', {
    url,
    events: ['MessageDelivery'],
    enabled: true,
  });

  // Store locally
  const config = response.data.webhook;
  await saveWebhookConfig(config);

  return config;
}
```

### Phase 2: Local Cache Setup (3 hours)

**Implementation:**

1. Add `src/lib/inbox-cache.ts`
2. Set up SQLite database
3. Implement CRUD operations
4. Add indexing for fast queries

**Cache Manager:**

```typescript
class InboxCache {
  private db: Database;

  async initialize(): Promise<void> {
    this.db = await openDatabase('~/.mailgoat/inbox/messages.db');
    await this.createSchema();
  }

  async addMessage(message: PostalMessage): Promise<void> {
    // Store metadata in SQLite
    await this.db.run(
      `
      INSERT INTO messages (id, from_email, to_email, subject, received_at, ...)
      VALUES (?, ?, ?, ?, ?, ...)
    `,
      [message.id, message.from, message.to, message.subject, Date.now()]
    );

    // Store full message as JSON
    await fs.writeFile(
      `~/.mailgoat/inbox/msg_${message.id}.json`,
      JSON.stringify(message, null, 2)
    );
  }

  async listMessages(filters: InboxFilters): Promise<Message[]> {
    let query = 'SELECT * FROM messages WHERE 1=1';
    const params = [];

    if (filters.unread) {
      query += ' AND read = 0';
    }

    if (filters.since) {
      query += ' AND received_at >= ?';
      params.push(filters.since);
    }

    if (filters.from) {
      query += ' AND from_email = ?';
      params.push(filters.from);
    }

    query += ' ORDER BY received_at DESC LIMIT ?';
    params.push(filters.limit || 50);

    return await this.db.all(query, params);
  }

  async getMessage(id: string): Promise<PostalMessage> {
    const content = await fs.readFile(`~/.mailgoat/inbox/msg_${id}.json`, 'utf-8');
    return JSON.parse(content);
  }

  async markAsRead(id: string): Promise<void> {
    await this.db.run('UPDATE messages SET read = 1 WHERE id = ?', [id]);
  }
}
```

### Phase 3: Inbox Command Update (2 hours)

**Implementation:**

1. Update `src/commands/inbox.ts`
2. Replace Postal API call with cache read
3. Add filter options
4. Add sync flag (optional)

**Command Logic:**

```typescript
async function inboxCommand(options: InboxOptions): Promise<void> {
  const cache = new InboxCache();
  await cache.initialize();

  // Build filters from options
  const filters: InboxFilters = {
    unread: options.unread,
    since: parseSinceOption(options.since),
    from: options.from,
    limit: options.limit || 50,
  };

  // Fetch from cache
  const messages = await cache.listMessages(filters);

  // Format output
  if (options.json) {
    console.log(JSON.stringify(messages, null, 2));
  } else {
    displayMessagesTable(messages);
  }
}
```

### Phase 4: Read Command Integration (1 hour)

**Implementation:**

1. Update `src/commands/read.ts`
2. Check cache first, fallback to Postal API
3. Auto-mark as read in cache

**Logic:**

```typescript
async function readCommand(messageId: string): Promise<void> {
  const cache = new InboxCache();
  await cache.initialize();

  // Try cache first
  let message = await cache.getMessage(messageId).catch(() => null);

  if (!message) {
    // Fallback to Postal API
    message = await postalClient.getMessage(messageId);
    // Optionally add to cache
    await cache.addMessage(message);
  }

  // Display message
  displayMessage(message);

  // Mark as read
  await cache.markAsRead(messageId);
}
```

### Phase 5: Webhook Receiver Reference (2 hours)

**Implementation:**

1. Create `examples/webhook-receiver.js`
2. Provide Express.js example
3. Show how to integrate with cache

**Example Server:**

```javascript
// examples/webhook-receiver.js
const express = require('express');
const { InboxCache } = require('mailgoat');

const app = express();
app.use(express.json());

const cache = new InboxCache();
await cache.initialize();

app.post('/inbox', async (req, res) => {
  try {
    const message = req.body.message;

    // Validate webhook signature (optional)
    if (!validateSignature(req)) {
      return res.status(401).send('Invalid signature');
    }

    // Store in cache
    await cache.addMessage(message);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000');
});
```

---

## API Changes

### New Postal API Calls

**1. Create Webhook**

```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://agent.example.com/inbox",
  "events": ["MessageDelivery"],
  "enabled": true
}
```

**2. List Webhooks**

```http
GET /api/v1/webhooks
```

**3. Delete Webhook**

```http
DELETE /api/v1/webhooks/{webhook_id}
```

### Webhook Payload Format

Postal sends:

```json
{
  "event": "MessageDelivery",
  "timestamp": 1708099200,
  "message": {
    "id": "msg_abc123",
    "from": "user@example.com",
    "to": "agent@example.com",
    "subject": "Meeting today",
    "plain_body": "Let's meet at 3pm",
    "html_body": "<p>Let's meet at 3pm</p>",
    "headers": {...},
    "attachments": [...]
  }
}
```

---

## Testing Requirements

### Unit Tests

**1. InboxCache Tests**

- `addMessage()` stores message correctly
- `listMessages()` returns filtered results
- `getMessage()` retrieves full message
- `markAsRead()` updates read status
- SQLite indexes work correctly

**2. Webhook Command Tests**

- `webhook add` creates webhook
- `webhook list` shows webhooks
- `webhook remove` deletes webhook
- `webhook test` validates endpoint

**3. Inbox Command Tests**

- Lists messages from cache
- Filters work (unread, since, from)
- JSON output format correct
- Empty inbox handled gracefully

### Integration Tests

**1. End-to-End Workflow**

```typescript
test('inbox webhook end-to-end', async () => {
  // 1. Set up webhook
  await mailgoat('webhook', 'add', testWebhookUrl);

  // 2. Send test email
  await sendTestEmail();

  // 3. Wait for webhook delivery
  await waitFor(2000);

  // 4. List inbox
  const messages = await mailgoat('inbox', '--json');

  // 5. Verify message appears
  expect(messages).toHaveLength(1);
  expect(messages[0].subject).toBe('Test Email');
});
```

**2. Cache Performance**

```typescript
test('inbox cache performance', async () => {
  // Add 1000 messages
  for (let i = 0; i < 1000; i++) {
    await cache.addMessage(generateTestMessage());
  }

  // Query should be fast
  const start = Date.now();
  const messages = await cache.listMessages({ limit: 50 });
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100); // < 100ms
});
```

**3. Error Scenarios**

- Webhook endpoint unreachable
- Webhook returns non-200 status
- Database corruption
- Disk full (cache storage)
- Invalid message format

---

## Success Metrics

### Functional

- ✅ Users can set up webhook in < 2 minutes
- ✅ Messages appear in inbox within 5 seconds of delivery
- ✅ Inbox listing works for 10,000+ cached messages
- ✅ All filters (unread, since, from) work correctly

### Performance

- ✅ Inbox listing < 500ms for 1,000 messages
- ✅ Inbox listing < 2s for 10,000 messages
- ✅ Webhook processing < 100ms per message
- ✅ Cache database < 10MB for 1,000 messages

### Reliability

- ✅ Zero message loss (all webhooks processed)
- ✅ Handles webhook delivery failures gracefully
- ✅ Cache survives system restarts
- ✅ No database corruption under normal use

### User Experience

- ✅ Setup documented clearly
- ✅ Error messages helpful
- ✅ Works with ngrok/localhost for testing
- ✅ Compatible with systemd for background daemon

---

## Open Questions

**1. Cache Size Limits**

- **Q:** How many messages to cache? Unlimited or limit (e.g., 10,000 most recent)?
- **Options:**
  - A) Unlimited (user responsibility to clean up)
  - B) 10,000 most recent (auto-delete older)
  - C) Configurable limit
- **Recommendation:** B (10,000 most recent) with config override
- **Why:** Prevents unbounded growth, 10k is enough for most use cases

**2. Webhook Security**

- **Q:** HMAC signature validation?
- **Options:**
  - A) No signature (trust Postal)
  - B) Optional signature (config flag)
  - C) Required signature (strict security)
- **Recommendation:** B (optional signature)
- **Why:** Flexible, users can choose security level

**3. Background Daemon**

- **Q:** Essential for v0.2 or can defer?
- **Recommendation:** Defer to v0.3
- **Why:** Webhook receiver is external (user's responsibility), daemon is nice-to-have

**4. Sync Command**

- **Q:** Should `--sync` actually work or just be placeholder?
- **Recommendation:** Placeholder for v0.2, implement if Postal adds list API
- **Why:** Postal API limitation still exists

**5. Cache Location**

- **Q:** ~/.mailgoat/inbox/ or configurable?
- **Recommendation:** Fixed location for v0.2, add config in v0.3
- **Why:** Simpler implementation, most users won't need custom location

---

## Risks & Mitigation

### Technical Risks

**1. SQLite Performance with Large Datasets**

- **Risk:** Slow queries with >10k messages
- **Likelihood:** MEDIUM
- **Mitigation:** Add proper indexes, test with 50k+ messages
- **Contingency:** Switch to PostgreSQL if needed

**2. Webhook Delivery Failures**

- **Risk:** Messages lost if webhook endpoint is down
- **Likelihood:** MEDIUM
- **Mitigation:** Postal retries, document that users need reliable endpoints
- **Contingency:** Add retry queue in CLI (future enhancement)

**3. Disk Space Exhaustion**

- **Risk:** Cache grows unbounded, fills disk
- **Likelihood:** LOW
- **Mitigation:** Implement 10k message limit with auto-cleanup
- **Contingency:** User can manually delete old messages

### User Experience Risks

**4. Complex Webhook Setup**

- **Risk:** Users struggle to set up webhook receiver
- **Likelihood:** MEDIUM
- **Mitigation:** Provide simple Express.js example, ngrok docs
- **Contingency:** Offer pre-built Docker image for webhook receiver

**5. Localhost Webhook Testing**

- **Risk:** Users can't test without public URL
- **Likelihood:** HIGH
- **Mitigation:** Document ngrok, provide test command
- **Contingency:** Add built-in webhook receiver mode (`mailgoat webhook serve`)

---

## Dependencies

**Upstream:**

- None (can start immediately after CI fixes)

**Downstream:**

- Search implementation (needs inbox cache)
- Advanced filtering (needs indexed cache)

**External:**

- Postal webhooks API (exists, tested)
- SQLite library (better-sqlite3)
- User-hosted webhook endpoint (user responsibility)

---

## Alternatives Considered

### Alternative 1: Poll Postal Database Directly

**Approach:** Query Postal's MySQL database for messages

**Pros:**

- No webhook needed
- Works with self-hosted Postal
- Simpler user setup

**Cons:**

- Requires database access (not available for managed Postal)
- Tight coupling to Postal's schema (breaks on upgrades)
- Security concern (database credentials)
- Not scalable

**Verdict:** ❌ Rejected - too brittle, doesn't work for managed Postal

### Alternative 2: IMAP Bridge

**Approach:** Expose Postal messages via IMAP, use IMAP client

**Pros:**

- Standard protocol
- Lots of IMAP libraries
- Works with any email client

**Cons:**

- Postal doesn't support IMAP out-of-box
- Would need to build IMAP server
- Overkill for CLI use case
- Latency (polling)

**Verdict:** ❌ Rejected - too complex, not agent-friendly

### Alternative 3: Wait for Postal API Update

**Approach:** Ask Postal to add `/messages/list` endpoint

**Pros:**

- Clean solution
- No workarounds needed
- Simple implementation

**Cons:**

- Unknown timeline (could be months)
- Depends on external team
- Blocks our launch

**Verdict:** ❌ Rejected - can't wait, need solution now

---

## Future Enhancements (v0.3+)

**1. Built-in Webhook Receiver**

```bash
mailgoat webhook serve --port 3000
# Runs local webhook receiver, auto-caches messages
```

**2. Webhook Retry Queue**

- If webhook processing fails, retry later
- Exponential backoff
- Max retries configurable

**3. Advanced Filters**

```bash
mailgoat inbox --tag important
mailgoat inbox --body "invoice"
mailgoat inbox --attachment-type pdf
```

**4. Export/Import**

```bash
mailgoat inbox export --format mbox
mailgoat inbox import messages.mbox
```

**5. Sync with Cloud**

- Optional S3/Dropbox backup of cache
- Multi-device sync

---

## Conclusion

Inbox webhooks are **critical for v0.2** and solve the biggest current user pain point. Implementation is **straightforward** (8-12 hours) with **low technical risk**.

**Go/No-Go:** ✅ GO  
**Priority:** P0 (must ship in v0.2)  
**Owner:** Developer 3  
**Timeline:** Week 1-2 of Phase 2

---

**Spec Status:** Ready for Implementation  
**Next Steps:** Assign to developer, create GitHub issue, track progress  
**Questions:** Contact Product Lead (@product-lead) or Lead Engineer
