# MailGoat Examples

Practical examples showing how to use MailGoat in real applications.

## Quick Start

1. Install MailGoat: `npm install -g mailgoat`
2. Configure: `mailgoat config init`
3. Run an example: `node examples/simple-send.js`

## JavaScript Script Examples

### 1. `simple-send.js`

Basic email sending for a single recipient.

Usage:

```bash
node examples/simple-send.js --to user@example.com
node examples/simple-send.js --to user@example.com --execute
```

### 2. `batch-send.js`

Send emails to multiple recipients from a CSV file.

Usage:

```bash
node examples/batch-send.js examples/recipients.csv
node examples/batch-send.js examples/recipients.csv --execute
```

### 3. `template-email.js`

Send a template-based email with variables.

Usage:

```bash
node examples/template-email.js --template welcome --to user@example.com --var name=Alice
node examples/template-email.js --template welcome --to user@example.com --var name=Alice --execute
```

### 4. `monitor-inbox.js`

Monitor inbox cache and print new messages as they appear.

Usage:

```bash
node examples/monitor-inbox.js --interval 10000 --limit 20
```

### 5. `webhook-server.js`

Run a simple webhook endpoint for event ingestion.

Usage:

```bash
node examples/webhook-server.js --port 3000
# Server starts on port 3000
```

### 6. `recipients.csv`

Sample CSV input for the batch sender.

Usage:

```bash
node examples/batch-send.js examples/recipients.csv --execute
```

## Use Cases

- Transactional emails: order confirmations, password resets
- Notifications: system alerts and user activity updates
- Newsletters: batch sending with templates
- Testing: E2E testing for email-dependent features
- Integration testing: automated email verification

## Existing Integration Examples

The repository also includes larger integration examples in:

- `examples/simple-python-agent/`
- `examples/nodejs-agent/`
- `examples/docker-agent/`
- `examples/notification-bot/`
- `examples/integrations/`
