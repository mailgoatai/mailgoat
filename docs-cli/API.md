# MailGoat CLI API Documentation

This document describes the Postal API endpoints used by MailGoat and how they map to CLI commands.

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Send Message](#send-message)
  - [Get Message](#get-message)
  - [Get Deliveries](#get-deliveries)
- [Data Structures](#data-structures)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

All Postal API requests require authentication via API key.

### Header

```
X-Server-API-Key: your-api-key-here
```

### Getting an API Key

1. Log into your Postal web UI (https://postal.example.com)
2. Navigate to your mail server
3. Go to **Credentials** section
4. Click **Create new credential**
5. Name it (e.g., "MailGoat CLI")
6. Copy the generated API key

### Security

- API keys have server-level permissions
- Never commit keys to version control
- Store in `~/.mailgoat/config.yml` (mode 0600)
- Rotate keys regularly

## Endpoints

### Send Message

Send an email message via Postal.

**Endpoint:** `POST /api/v1/send/message`

**Headers:**
```
X-Server-API-Key: <api-key>
Content-Type: application/json
```

**Request Body:**

```json
{
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "from": "sender@example.com",
  "sender": "sender@example.com",
  "subject": "Email subject",
  "reply_to": "reply@example.com",
  "plain_body": "Plain text body",
  "html_body": "<html><body>HTML body</body></html>",
  "bounce": false,
  "tag": "custom-tag",
  "headers": {
    "X-Custom-Header": "value"
  },
  "attachments": [
    {
      "name": "document.pdf",
      "content_type": "application/pdf",
      "data": "base64-encoded-data-here"
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string[] | Yes | Recipient email addresses (max 50) |
| `cc` | string[] | No | CC recipients (max 50) |
| `bcc` | string[] | No | BCC recipients (max 50) |
| `from` | string | Yes | Sender email (must be authorized) |
| `sender` | string | No | Envelope sender |
| `subject` | string | Yes | Email subject |
| `reply_to` | string | No | Reply-To address |
| `plain_body` | string | No* | Plain text body |
| `html_body` | string | No* | HTML body |
| `bounce` | boolean | No | Mark as bounce message |
| `tag` | string | No | Custom tag for tracking |
| `headers` | object | No | Custom headers |
| `attachments` | array | No | File attachments (base64-encoded) |

\* At least one of `plain_body` or `html_body` required.

**Response (Success):**

```json
{
  "status": "success",
  "time": 0.123,
  "flags": {},
  "data": {
    "message_id": "abc123-def456-ghi789",
    "messages": {
      "recipient@example.com": {
        "id": 12345,
        "token": "xyz789"
      }
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data.message_id` | string | Unique message identifier |
| `data.messages` | object | Per-recipient message details |
| `data.messages[email].id` | number | Internal message ID |
| `data.messages[email].token` | string | Message token |

**Errors:**

| Code | Message | Cause |
|------|---------|-------|
| `NoRecipients` | No recipients defined | Missing `to`, `cc`, and `bcc` |
| `NoContent` | No content defined | Missing both `plain_body` and `html_body` |
| `TooManyToAddresses` | Max To addresses reached | More than 50 in `to` |
| `TooManyCCAddresses` | Max CC addresses reached | More than 50 in `cc` |
| `TooManyBCCAddresses` | Max BCC addresses reached | More than 50 in `bcc` |
| `FromAddressMissing` | From address required | Missing `from` |
| `UnauthenticatedFromAddress` | From not authorized | `from` not in server's domains |
| `AttachmentMissingName` | Attachment missing name | Attachment without `name` |
| `AttachmentMissingData` | Attachment missing data | Attachment without `data` |

**CLI Mapping:**

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "Subject" \
  --body "Body text" \
  [--from sender@example.com] \
  [--cc cc@example.com] \
  [--bcc bcc@example.com] \
  [--html] \
  [--tag custom-tag] \
  [--attach file1 --attach file2] \
  [--json]
```

---

### Get Message

Retrieve details about a specific message.

**Endpoint:** `POST /api/v1/messages/message`

**Headers:**
```
X-Server-API-Key: <api-key>
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "message-id-or-token",
  "_expansions": ["status", "details", "plain_body"]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Message ID or token |
| `_expansions` | string[] or boolean | No | Data to include (see below) |

**Expansions:**

| Value | Description |
|-------|-------------|
| `status` | Delivery status, hold state |
| `details` | Sender, recipient, subject, timestamp |
| `inspection` | Spam/threat inspection results |
| `plain_body` | Plain text message body |
| `html_body` | HTML message body |
| `attachments` | File attachments (base64) |
| `headers` | Email headers |
| `raw_message` | Full raw message (base64) |
| `activity_entries` | Tracking data (opens, clicks) |
| `true` | All expansions |

**Response (Success):**

```json
{
  "status": "success",
  "time": 0.045,
  "flags": {},
  "data": {
    "id": 12345,
    "token": "xyz789",
    "status": {
      "status": "Sent",
      "last_delivery_attempt": 1642345678.0,
      "held": false,
      "hold_expiry": null
    },
    "details": {
      "rcpt_to": "recipient@example.com",
      "mail_from": "sender@example.com",
      "subject": "Email subject",
      "message_id": "abc123-def456",
      "timestamp": 1642345678.0,
      "direction": "outgoing",
      "size": 1234,
      "bounce": false,
      "bounce_for_id": null,
      "tag": "custom-tag",
      "received_with_ssl": true
    },
    "inspection": {
      "inspected": true,
      "spam": false,
      "spam_score": 0.5,
      "threat": false,
      "threat_details": null
    },
    "plain_body": "Email body text"
  }
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `Pending` | Queued for delivery |
| `Sent` | Successfully sent |
| `Held` | Held for manual review |
| `Bounced` | Delivery failed |

**Inspection Values:**

| Field | Type | Description |
|-------|------|-------------|
| `inspected` | boolean | Whether inspection ran |
| `spam` | boolean | Marked as spam |
| `spam_score` | number | Spam score (0-10+) |
| `threat` | boolean | Contains threats |
| `threat_details` | string | Threat description |

**Errors:**

| Code | Message | Cause |
|------|---------|-------|
| `MessageNotFound` | Message not found | Invalid or inaccessible message ID |

**CLI Mapping:**

```bash
mailgoat read <message-id> [--full] [--json]
```

---

### Get Deliveries

Get delivery attempts for a message.

**Endpoint:** `POST /api/v1/messages/deliveries`

**Headers:**
```
X-Server-API-Key: <api-key>
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "message-id-or-token"
}
```

**Response (Success):**

```json
{
  "status": "success",
  "time": 0.032,
  "flags": {},
  "data": [
    {
      "id": 789,
      "status": "Sent",
      "details": "250 2.0.0 OK",
      "output": "Delivered successfully",
      "sent_with_ssl": true,
      "log_id": "abc123",
      "time": 1642345678.0,
      "timestamp": 1642345678.0
    }
  ]
}
```

**Delivery Status Values:**

| Status | Description |
|--------|-------------|
| `Sent` | Successfully delivered |
| `SoftFail` | Temporary failure (will retry) |
| `HardFail` | Permanent failure (no retry) |

**CLI Usage:**

Not directly exposed as a command yet. Future:

```bash
mailgoat deliveries <message-id>
```

---

## Data Structures

### Timestamp Format

All timestamps are Unix epoch seconds (float):

```json
{
  "timestamp": 1642345678.123
}
```

Convert in JavaScript:
```javascript
const date = new Date(timestamp * 1000);
```

### Email Address Format

Emails can be:
- Plain address: `"user@example.com"`
- With name: `"User Name <user@example.com>"`

Arrays for multiple recipients:
```json
{
  "to": [
    "user1@example.com",
    "User Two <user2@example.com>"
  ]
}
```

### Base64 Encoding

Attachments and raw messages use base64:

```javascript
// Encode
const base64 = Buffer.from(data).toString('base64');

// Decode
const data = Buffer.from(base64, 'base64');
```

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "time": 0.012,
  "flags": {},
  "data": {
    "code": "ErrorCode",
    "message": "Human-readable error message",
    "field": "optional-field-name"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Response |
|------|---------|----------|
| 200 | OK | Success response |
| 401 | Unauthorized | Invalid API key |
| 404 | Not Found | Invalid endpoint or message |
| 422 | Unprocessable | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |

### Error Categories

**Authentication Errors:**
- Missing `X-Server-API-Key` header
- Invalid API key
- Expired credential

**Validation Errors:**
- Missing required fields
- Invalid email format
- Too many recipients
- Unauthorized sender domain

**Resource Errors:**
- Message not found
- Server not found

**Rate Limiting:**
- See [Rate Limiting](#rate-limiting) section

## Rate Limiting

Postal doesn't document explicit rate limits, but best practices:

### Recommended Limits

- **Send rate:** 10-100 messages/second per server
- **API calls:** 1000 requests/minute
- **Burst:** Allow short bursts, but throttle sustained high rates

### Implementation

```javascript
// Simple rate limiter
class RateLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond;
    this.queue = [];
  }

  async throttle() {
    const now = Date.now();
    this.queue = this.queue.filter(t => now - t < 1000);
    
    if (this.queue.length >= this.maxPerSecond) {
      const oldestRequest = this.queue[0];
      const waitTime = 1000 - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.queue.push(Date.now());
  }
}

// Usage
const limiter = new RateLimiter(10); // 10 req/sec
await limiter.throttle();
await postalClient.sendMessage(...);
```

### Handling 429 Errors

```javascript
async function sendWithRetry(client, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.sendMessage(params);
    } catch (error) {
      if (error.response?.status === 429) {
        // Exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## API Client Implementation

### TypeScript Example

See `src/lib/postal-client.ts` for full implementation.

```typescript
import axios, { AxiosInstance } from 'axios';

export class PostalClient {
  private client: AxiosInstance;

  constructor(config: { server: string; api_key: string }) {
    this.client = axios.create({
      baseURL: `https://${config.server}`,
      headers: {
        'X-Server-API-Key': config.api_key,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    const response = await this.client.post('/api/v1/send/message', params);
    return response.data.data;
  }

  async getMessage(messageId: string, expansions?: string[]): Promise<MessageDetails> {
    const response = await this.client.post('/api/v1/messages/message', {
      id: messageId,
      _expansions: expansions || ['status', 'details', 'plain_body'],
    });
    return response.data.data;
  }
}
```

### Python Example

```python
import requests
import json

class PostalClient:
    def __init__(self, server, api_key):
        self.base_url = f"https://{server}"
        self.api_key = api_key
        self.headers = {
            'X-Server-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def send_message(self, to, subject, body, **kwargs):
        payload = {
            'to': to if isinstance(to, list) else [to],
            'subject': subject,
            'plain_body': body,
            **kwargs
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/send/message",
            headers=self.headers,
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json()['data']
    
    def get_message(self, message_id, expansions=None):
        payload = {
            'id': message_id,
            '_expansions': expansions or ['status', 'details', 'plain_body']
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/messages/message",
            headers=self.headers,
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json()['data']
```

## Testing

### Manual Testing with cURL

```bash
# Send message
curl -X POST https://postal.example.com/api/v1/send/message \
  -H "X-Server-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "from": "sender@example.com",
    "subject": "Test",
    "plain_body": "Hello world"
  }' | jq

# Get message
curl -X POST https://postal.example.com/api/v1/messages/message \
  -H "X-Server-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "message-id-here",
    "_expansions": ["status", "details"]
  }' | jq
```

### Testing with MailGoat CLI

```bash
# Test send
mailgoat send \
  --to test@example.com \
  --subject "Test" \
  --body "Hello" \
  --json

# Test read (use message_id from send output)
mailgoat read <message-id> --json
```

## References

- **Postal GitHub:** https://github.com/postalserver/postal
- **Postal API Controllers:**
  - `/app/controllers/legacy_api/send_controller.rb`
  - `/app/controllers/legacy_api/messages_controller.rb`
- **MailGoat Implementation:** See `src/lib/postal-client.ts`

## Changelog

- **2024-02-15:** Initial API documentation for MVP
- Future: Add webhook endpoints, batch sending, etc.

---

For more information, see [README.md](./README.md) and [EXAMPLES.md](./EXAMPLES.md).
