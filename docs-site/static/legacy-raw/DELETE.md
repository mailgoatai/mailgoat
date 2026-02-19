# Delete Command Documentation

The `mailgoat delete` command allows you to delete email messages from your Postal server. It supports both single message deletion and bulk deletion with various filtering options.

## Quick Start

```bash
# Delete a single message
mailgoat delete msg-12345

# Dry run (see what would be deleted)
mailgoat delete msg-12345 --dry-run

# Delete without confirmation
mailgoat delete msg-12345 --yes
```

## Single Message Deletion

### Basic Usage

```bash
# Delete by message ID
mailgoat delete <message-id>
```

### With Confirmation

By default, the CLI will ask for confirmation:

```bash
$ mailgoat delete msg-12345
? Delete message msg-12345? (y/N) y
✓ Message msg-12345 deleted successfully
```

### Skip Confirmation

Use `--yes` or `-y` to skip the confirmation prompt:

```bash
mailgoat delete msg-12345 --yes
```

**⚠️ WARNING:** Use `--yes` with caution, especially in scripts.

### Dry Run

Preview what would be deleted without actually deleting:

```bash
mailgoat delete msg-12345 --dry-run

# Output:
# [DRY RUN] Would delete message: msg-12345
```

## Bulk Deletion (Coming Soon)

**Note:** Bulk deletion with filters requires inbox querying capabilities. Currently, only single message deletion by ID is supported.

### Planned Features

The following filter options are planned for future releases:

#### Delete by Age

```bash
# Delete messages older than 30 days
mailgoat delete --older-than 30d

# Delete messages older than 2 weeks
mailgoat delete --older-than 2w

# Delete messages older than 6 hours
mailgoat delete --older-than 6h
```

**Supported duration formats:**

- `h` - hours (e.g., `6h`)
- `d` - days (e.g., `30d`)
- `w` - weeks (e.g., `2w`)
- `m` - months (e.g., `3m`)
- `y` - years (e.g., `1y`)

#### Delete by Sender

```bash
# Delete all messages from a specific sender
mailgoat delete --from spam@example.com
```

#### Delete by Recipient

```bash
# Delete all messages sent to a specific recipient
mailgoat delete --to old-address@example.com
```

#### Delete by Tag

```bash
# Delete all messages with a specific tag
mailgoat delete --tag newsletter
```

#### Delete by Subject

```bash
# Delete messages with subject containing text
mailgoat delete --subject "RE: Old Thread"
```

#### Combine Filters

```bash
# Delete old messages from specific sender
mailgoat delete --older-than 90d --from spam@example.com

# Delete tagged messages older than 30 days
mailgoat delete --older-than 30d --tag test
```

#### Limit Bulk Deletions

```bash
# Delete maximum 50 messages (default is 100)
mailgoat delete --older-than 30d --limit 50
```

### Bulk Deletion Safety

Bulk deletions will always:

1. **Show preview** of what will be deleted
2. **Require confirmation** (unless `--yes` is used)
3. **Respect limits** (default max 100 messages)
4. **Support dry-run** mode

Example bulk delete flow:

```bash
$ mailgoat delete --older-than 30d --from spam@example.com

Bulk delete operation:
Filters:
  • older than 30 days
  • from spam@example.com

Found 42 messages matching filters:
  msg-001 - From: spam@example.com - "Spam Subject" (45 days old)
  msg-002 - From: spam@example.com - "More Spam" (52 days old)
  ...

? Delete 42 messages? (y/N) y

Deleting messages...
✓ 42 messages deleted successfully
```

## Options Reference

### Message ID (argument)

```
mailgoat delete <message-id>
```

The message ID to delete. Get message IDs from `mailgoat inbox` or `mailgoat read`.

### `--older-than <duration>`

Delete messages older than the specified duration.

**Format:** `<number><unit>` where unit is `h`, `d`, `w`, `m`, or `y`

**Examples:**

- `--older-than 30d` - 30 days
- `--older-than 2w` - 2 weeks
- `--older-than 6h` - 6 hours

### `--from <email>`

Delete messages from a specific sender email address.

```bash
mailgoat delete --from spam@example.com
```

### `--to <email>`

Delete messages sent to a specific recipient.

```bash
mailgoat delete --to old-email@example.com
```

### `--tag <tag>`

Delete messages with a specific tag.

```bash
mailgoat delete --tag newsletter
```

### `--subject <text>`

Delete messages where the subject contains the specified text (partial match, case-insensitive).

```bash
mailgoat delete --subject "old thread"
```

### `--dry-run`

Preview what would be deleted without actually performing the deletion.

```bash
mailgoat delete msg-12345 --dry-run
```

Safe to use - no changes will be made.

### `--yes`, `-y`

Skip confirmation prompts. **Use with caution!**

```bash
mailgoat delete msg-12345 --yes
```

### `--limit <number>`

For bulk operations, limit the maximum number of messages to delete.

**Default:** 100

```bash
mailgoat delete --older-than 30d --limit 50
```

### `--json`

Output results in JSON format for script integration.

```bash
mailgoat delete msg-12345 --json
```

**Output:**

```json
{
  "success": true,
  "deleted": ["msg-12345"],
  "count": 1
}
```

## Examples

### Delete Single Message

```bash
# With confirmation
mailgoat delete msg-abc123

# Skip confirmation
mailgoat delete msg-abc123 --yes

# Dry run
mailgoat delete msg-abc123 --dry-run

# JSON output
mailgoat delete msg-abc123 --json
```

### Delete Old Messages (Planned)

```bash
# Delete messages older than 90 days
mailgoat delete --older-than 90d

# Dry run first to see what would be deleted
mailgoat delete --older-than 90d --dry-run

# Then actually delete
mailgoat delete --older-than 90d
```

### Delete from Specific Sender (Planned)

```bash
# Delete all spam
mailgoat delete --from spam@example.com --yes
```

### Delete Test Messages (Planned)

```bash
# Delete messages tagged as "test"
mailgoat delete --tag test --older-than 7d
```

### Cleanup Old Newsletters (Planned)

```bash
# Delete newsletters older than 30 days
mailgoat delete --tag newsletter --older-than 30d --limit 100
```

## Script Integration

### Bash Script

```bash
#!/bin/bash
# delete-old-messages.sh

# Delete messages older than 90 days
mailgoat delete --older-than 90d --json > /tmp/delete-result.json

if [ $? -eq 0 ]; then
  count=$(cat /tmp/delete-result.json | jq -r '.count')
  echo "Deleted $count messages successfully"
else
  echo "Failed to delete messages"
  exit 1
fi
```

### Cron Job

```bash
# Delete old messages weekly
0 2 * * 0 /usr/local/bin/mailgoat delete --older-than 90d --yes >> /var/log/mailgoat-cleanup.log 2>&1
```

### CI/CD Cleanup

```yaml
# GitHub Actions - cleanup test emails
- name: Cleanup test emails
  run: |
    mailgoat delete --tag ci-test --older-than 1h --yes
```

## Safety Features

### Confirmation Prompts

All delete operations (except with `--yes`) require confirmation:

```bash
$ mailgoat delete msg-12345
? Delete message msg-12345? (y/N)
```

For bulk operations, you'll see a detailed preview:

```bash
$ mailgoat delete --older-than 30d
Found 123 messages older than 30 days.

? Delete 123 messages? (y/N)
```

### Dry Run Mode

Always available to preview deletions:

```bash
mailgoat delete --older-than 30d --dry-run
```

Shows what would be deleted without making changes.

### Deletion Limits

Bulk operations are limited to 100 messages by default:

```bash
# Will only delete first 100 matching messages
mailgoat delete --older-than 30d
```

Adjust with `--limit`:

```bash
mailgoat delete --older-than 30d --limit 500
```

### No Accidental Deletion

Without a message ID or filters, the command will fail:

```bash
$ mailgoat delete
Error: Must provide either a message ID or filtering options (--older-than, --from, etc.)
```

## Troubleshooting

### Message Not Found

```
Error: Message 'msg-12345' not found
```

**Cause:** Message ID doesn't exist or has already been deleted.

**Solution:** Check message ID with `mailgoat inbox` or `mailgoat read`.

### Permission Denied

```
Error: Authentication failed. Your API key is invalid or expired.
```

**Cause:** Invalid or expired API key.

**Solution:** Run `mailgoat config init` to update your API key.

### Connection Timeout

```
Error: Connection to Postal server timed out.
```

**Cause:** Network issue or Postal server is down.

**Solution:**

1. Check your internet connection
2. Verify Postal server status
3. Try again later

### Bulk Delete Not Working

```
Note: Bulk delete with filters requires inbox listing API (not yet implemented)
```

**Cause:** Bulk delete features require inbox querying, which is not yet implemented.

**Current Solution:** Use single message deletion by ID:

```bash
mailgoat delete msg-12345
```

**Future:** Bulk delete will be available when inbox listing is implemented.

## Best Practices

### 1. Always Dry Run First

Before bulk deletions, do a dry run:

```bash
# Check what will be deleted
mailgoat delete --older-than 30d --dry-run

# If looks good, run for real
mailgoat delete --older-than 30d
```

### 2. Use Conservative Limits

Start with small limits and increase if needed:

```bash
# Start with 10 to be safe
mailgoat delete --older-than 30d --limit 10

# Increase if needed
mailgoat delete --older-than 30d --limit 100
```

### 3. Test with Single Messages

Test deletion with a single message first:

```bash
# Find a test message
mailgoat inbox --limit 1

# Delete it
mailgoat delete msg-test-123
```

### 4. Use Tags for Cleanup

Tag messages you plan to delete:

```bash
# Send with tag
mailgoat send --to user@example.com --subject "Test" --body "..." --tag temp

# Delete by tag later
mailgoat delete --tag temp
```

### 5. Automate Carefully

When automating deletions, use `--json` and check results:

```bash
result=$(mailgoat delete msg-12345 --yes --json)
if [ $(echo "$result" | jq -r '.success') = "true" ]; then
  echo "Success"
fi
```

### 6. Keep Logs

For automated cleanup, keep logs:

```bash
mailgoat delete --older-than 90d --yes 2>&1 | tee -a cleanup.log
```

## Related Commands

- [`mailgoat inbox`](./INBOX.md) - List messages to find IDs
- [`mailgoat read`](./READ.md) - View message details before deleting
- [`mailgoat send`](./SEND.md) - Send messages with tags for easier cleanup

## Implementation Status

### Current (v0.1.0)

✅ Single message deletion by ID  
✅ Confirmation prompts  
✅ Dry-run mode  
✅ `--yes` flag for automation  
✅ JSON output  
✅ Debug mode support

### Coming Soon

🚧 Bulk deletion with filters:

- `--older-than`
- `--from`
- `--to`
- `--tag`
- `--subject`

🚧 Progress indicators for bulk operations  
🚧 Deletion statistics and reporting  
🚧 Undo/recovery options

## FAQs

### Can I recover deleted messages?

No, deletion is permanent. Postal does not provide message recovery.

**Best practice:** Use `--dry-run` before deleting.

### How do I delete all messages?

Currently not supported for safety reasons. You must:

1. Use single message deletion
2. Wait for bulk delete implementation

### Can I delete messages from the web UI?

This is a CLI tool. For web UI, use Postal's web interface.

### Are there rate limits?

Postal may have rate limits on deletions. The CLI will respect retry-after headers automatically.

### Can I pause a bulk deletion?

Bulk deletions (when implemented) will be atomic - either all succeed or all fail. No pause/resume.

## Debug Mode

Enable debug mode to see detailed deletion information:

```bash
mailgoat delete msg-12345 --debug
```

Or use environment variable:

```bash
DEBUG=mailgoat:* mailgoat delete msg-12345
```

Debug output shows:

- API requests and responses
- Retry attempts
- Timing information
- Error details

See [Debug Mode Guide](./DEBUG.md) for more information.

## See Also

- [CLI Reference](./CLI-REFERENCE.md)
- [Postal API Documentation](https://postal.example.com/docs/api)
- [Inbox Command](./INBOX.md)
- [Read Command](./READ.md)
