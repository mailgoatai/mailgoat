# Search Command Documentation

The `mailgoat search` command allows you to find messages using various filtering options including sender, recipient, subject, body content, date ranges, and tags.

## Status

**⚠️ COMING SOON:** The search command is currently a placeholder. Full implementation requires Postal's inbox/message listing API endpoints. The command structure and filters are designed and ready for implementation.

## Quick Start (When Available)

```bash
# Search by sender
mailgoat search --from user@example.com

# Search by subject
mailgoat search --subject "invoice"

# Search with date range
mailgoat search --after 2024-01-01 --before 2024-12-31

# Combine filters
mailgoat search --from user@example.com --subject "report" --after 7d
```

## Planned Features

### Search Filters

#### By Sender (`--from`)

Search messages from a specific email address:

```bash
mailgoat search --from user@example.com
mailgoat search --from support@company.com
```

#### By Recipient (`--to`)

Search messages sent to a specific email address:

```bash
mailgoat search --to admin@example.com
mailgoat search --to team@company.com
```

#### By Subject (`--subject`)

Search messages with subject containing text (partial match, case-insensitive):

```bash
mailgoat search --subject "invoice"
mailgoat search --subject "meeting notes"
```

#### By Body Content (`--body`)

Search message body for specific text (full-text search):

```bash
mailgoat search --body "urgent"
mailgoat search --body "contract renewal"
```

#### Date Range (`--after`, `--before`)

Search messages within a date range:

```bash
# After specific date
mailgoat search --after 2024-01-01

# Before specific date
mailgoat search --before 2024-12-31

# Date range
mailgoat search --after 2024-01-01 --before 2024-06-30

# Relative dates
mailgoat search --after 7d      # Last 7 days
mailgoat search --after 2w      # Last 2 weeks
mailgoat search --after 3m      # Last 3 months
mailgoat search --before 1y     # Before 1 year ago
```

**Supported date formats:**
- ISO dates: `2024-01-01`, `2024-01-15`
- Relative: `7d` (days), `2w` (weeks), `3m` (months), `1y` (years)

#### By Tag (`--tag`)

Search messages with a specific tag:

```bash
mailgoat search --tag newsletter
mailgoat search --tag important
```

#### With Attachments (`--has-attachment`)

Search only messages that have attachments:

```bash
mailgoat search --has-attachment
mailgoat search --from user@example.com --has-attachment
```

### Result Control

#### Limit Results (`--limit`)

Control the maximum number of results returned:

```bash
# Default: 25 results
mailgoat search --from user@example.com

# Custom limit
mailgoat search --from user@example.com --limit 50

# Maximum: 1000 results
mailgoat search --from user@example.com --limit 1000
```

**Range:** 1-1000, default: 25

#### Sort Results (`--sort`)

Sort results by different fields:

```bash
# Sort by date (default)
mailgoat search --from user@example.com --sort date

# Sort by sender
mailgoat search --subject "report" --sort from

# Sort by recipient
mailgoat search --after 7d --sort to

# Sort by subject
mailgoat search --body "meeting" --sort subject
```

**Options:** `date`, `from`, `to`, `subject`

#### Sort Order (`--order`)

Control sort direction:

```bash
# Descending (newest first, default)
mailgoat search --from user@example.com --order desc

# Ascending (oldest first)
mailgoat search --from user@example.com --order asc
```

**Options:** `asc`, `desc` (default: `desc`)

### Output Format

#### Table View (Default)

Human-readable table format:

```bash
$ mailgoat search --from user@example.com --limit 5

Search filters:
  • from: user@example.com
  • limit: 5
  • sort: date (desc)

┌──────────────┬────────────────────┬──────────────────────┬────────────────────────┬────────────┐
│ Message ID   │ From               │ To                   │ Subject                │ Date       │
├──────────────┼────────────────────┼──────────────────────┼────────────────────────┼────────────┤
│ msg-001      │ user@example.com   │ admin@example.com    │ Monthly Report         │ 2024-02-15 │
│ msg-002      │ user@example.com   │ team@example.com     │ Meeting Notes          │ 2024-02-14 │
│ msg-003      │ user@example.com   │ support@example.com  │ Question about invoice │ 2024-02-13 │
│ msg-004      │ user@example.com   │ admin@example.com    │ Follow-up              │ 2024-02-12 │
│ msg-005      │ user@example.com   │ team@example.com     │ Project Update         │ 2024-02-11 │
└──────────────┴────────────────────┴──────────────────────┴────────────────────────┴────────────┘

Found 5 messages (showing 5)
```

#### JSON Output (`--json`)

Machine-readable JSON format:

```bash
mailgoat search --from user@example.com --limit 5 --json
```

**Output:**
```json
{
  "success": true,
  "count": 5,
  "total": 42,
  "filters": {
    "from": "user@example.com",
    "limit": 5
  },
  "messages": [
    {
      "id": "msg-001",
      "from": "user@example.com",
      "to": ["admin@example.com"],
      "subject": "Monthly Report",
      "date": "2024-02-15T10:30:00Z",
      "hasAttachment": false,
      "tag": "report"
    }
  ]
}
```

## Examples

### Basic Searches

```bash
# Find all messages from a sender
mailgoat search --from user@example.com

# Find messages to a recipient
mailgoat search --to admin@example.com

# Search by subject
mailgoat search --subject "invoice"

# Search body content
mailgoat search --body "urgent"
```

### Date-Based Searches

```bash
# Messages from last week
mailgoat search --after 7d

# Messages from last month
mailgoat search --after 30d

# Messages in date range
mailgoat search --after 2024-01-01 --before 2024-01-31

# Recent messages from specific sender
mailgoat search --from user@example.com --after 7d
```

### Combined Filters

```bash
# Sender + subject
mailgoat search --from user@example.com --subject "report"

# Subject + date range
mailgoat search --subject "invoice" --after 2024-01-01 --before 2024-12-31

# Multiple criteria
mailgoat search \
  --from user@example.com \
  --subject "meeting" \
  --after 7d \
  --has-attachment
```

### Tag-Based Searches

```bash
# Find newsletters
mailgoat search --tag newsletter

# Recent newsletters
mailgoat search --tag newsletter --after 30d

# Tagged messages from sender
mailgoat search --tag important --from boss@example.com
```

### Attachment Searches

```bash
# All messages with attachments
mailgoat search --has-attachment

# Attachments from sender
mailgoat search --from user@example.com --has-attachment

# Recent attachments
mailgoat search --has-attachment --after 7d
```

### Sorting and Limiting

```bash
# Most recent messages
mailgoat search --from user@example.com --sort date --order desc

# Oldest messages first
mailgoat search --from user@example.com --sort date --order asc

# Get more results
mailgoat search --from user@example.com --limit 100

# Sort by subject
mailgoat search --after 7d --sort subject --order asc
```

## Script Integration

### Bash Script

```bash
#!/bin/bash
# find-urgent-messages.sh

# Search for urgent messages
results=$(mailgoat search \
  --body "urgent" \
  --after 7d \
  --json)

# Parse results
count=$(echo "$results" | jq -r '.count')
echo "Found $count urgent messages in last 7 days"

# List message IDs
echo "$results" | jq -r '.messages[].id' | while read msg_id; do
  echo "  - $msg_id"
done
```

### Python Script

```python
#!/usr/bin/env python3
import subprocess
import json

# Search for messages
result = subprocess.run([
    'mailgoat', 'search',
    '--from', 'user@example.com',
    '--after', '30d',
    '--json'
], capture_output=True, text=True)

data = json.loads(result.stdout)

print(f"Found {data['count']} messages")

for msg in data['messages']:
    print(f"  {msg['id']}: {msg['subject']}")
```

### Daily Report

```bash
#!/bin/bash
# daily-message-report.sh

echo "📧 Daily Message Report - $(date +%Y-%m-%d)"
echo

echo "Messages from today:"
mailgoat search --after 1d --limit 100 --json | \
  jq -r '.count' | \
  xargs -I {} echo "  Total: {} messages"

echo

echo "Messages from important contacts:"
mailgoat search --from boss@example.com --after 1d --limit 10

echo

echo "Messages with attachments:"
mailgoat search --has-attachment --after 1d --limit 10
```

## Advanced Use Cases

### Find Orphaned Messages

Find messages without tags:

```bash
# This would require API support
mailgoat search --no-tag --limit 100
```

### Search by Size

Find large messages (when implemented):

```bash
mailgoat search --min-size 5MB
mailgoat search --max-size 1MB
```

### Search by Status

Find messages by delivery status (when implemented):

```bash
mailgoat search --status bounced
mailgoat search --status held
```

### Export Search Results

Export search results to CSV:

```bash
mailgoat search --from user@example.com --json | \
  jq -r '.messages[] | [.id, .from, .to[0], .subject, .date] | @csv' > results.csv
```

## API Structure (For Implementation)

When implementing search, the following API pattern is expected:

### Request

```bash
POST /api/v1/messages/search
```

**Body:**
```json
{
  "filters": {
    "from": "user@example.com",
    "to": "admin@example.com",
    "subject": "invoice",
    "body": "urgent",
    "after": 1704067200,
    "before": 1735689600,
    "tag": "important",
    "hasAttachment": true
  },
  "limit": 25,
  "offset": 0,
  "sort": "date",
  "order": "desc"
}
```

### Response

```json
{
  "status": "success",
  "data": {
    "total": 42,
    "count": 25,
    "messages": [
      {
        "id": "msg-001",
        "from": "user@example.com",
        "to": ["admin@example.com"],
        "subject": "Monthly Report",
        "preview": "Here is the monthly report...",
        "timestamp": 1708000000,
        "tag": "report",
        "hasAttachment": false,
        "size": 1024
      }
    ]
  }
}
```

## Current Status

**⚠️ Not Yet Implemented**

The search command is ready but requires:
1. Postal inbox/message listing API
2. Search/query endpoint support
3. Filtering capabilities on the server side

**Workaround:** Use `mailgoat inbox` command to list messages, then filter manually.

## Related Commands

- [`mailgoat inbox`](./INBOX.md) - List recent messages
- [`mailgoat read`](./READ.md) - Read specific message
- [`mailgoat delete`](./DELETE.md) - Delete messages by ID

## Debug Mode

Enable debug mode to see search internals:

```bash
mailgoat search --from user@example.com --debug
```

Or use environment variable:

```bash
DEBUG=mailgoat:* mailgoat search --from user@example.com
```

## FAQs

### When will search be available?

Search will be available when:
1. Postal provides inbox/message listing APIs
2. Search/query endpoints are implemented
3. The MailGoat client adds search support

### How is search different from inbox?

- **Inbox:** Lists recent messages (chronological)
- **Search:** Finds specific messages (filtered, sorted)

### Can I search message content?

Yes (when implemented), both subject and body content will be searchable.

### Are searches case-sensitive?

No, searches will be case-insensitive by default.

### Can I save search queries?

Not yet, but this feature is planned for future releases.

### What's the maximum result limit?

1000 messages per search query.

## Implementation Checklist

- [x] Command structure defined
- [x] Filter options specified
- [x] Date parsing implemented
- [x] Output formatting planned
- [x] Documentation written
- [ ] Postal API integration
- [ ] Result caching
- [ ] Pagination support
- [ ] Saved searches
- [ ] Search history

## See Also

- [CLI Reference](./CLI-REFERENCE.md)
- [Inbox Command](./INBOX.md)
- [Delete Command](./DELETE.md)
- [Templates](./TEMPLATES.md)
