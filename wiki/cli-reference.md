# CLI Reference

Complete reference for all MailGoat CLI commands.

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (for scripts/agents) |
| `--help` | Show help for a command |
| `--version` | Show MailGoat version |

## Commands

- [send](#send) - Send an email
- [read](#read) - Read a message by ID
- [config](#config) - Manage configuration
- [version](#version) - Show version information

---

## send

Send an email via the command line.

### Syntax

```bash
mailgoat send [options]
```

### Required Options

| Option | Description | Example |
|--------|-------------|---------|
| `--to EMAIL` | Recipient email address | `--to user@example.com` |
| `--subject TEXT` | Email subject line | `--subject "Weekly Report"` |
| `--body TEXT` | Email body content | `--body "Here's the report..."` |

### Optional Flags

| Option | Description | Example |
|--------|-------------|---------|
| `--html` | Treat body as HTML (default: plain text) | `--html` |
| `--cc EMAIL` | Carbon copy recipient | `--cc manager@example.com` |
| `--bcc EMAIL` | Blind carbon copy recipient | `--bcc archive@example.com` |
| `--from EMAIL` | Override sender address (must be allowed) | `--from bot@example.com` |
| `--tag TAG` | Tag message for filtering/tracking | `--tag weekly-report` |
| `--attach FILE` | Attach a file (repeat for multiple) | `--attach report.pdf --attach chart.png` |
| `--json` | Output in JSON format | `--json` |

### Examples

**Basic send:**
```bash
mailgoat send \
  --to user@example.com \
  --subject "Hello" \
  --body "This is a test message"
```

**HTML email:**
```bash
mailgoat send \
  --to user@example.com \
  --subject "HTML Test" \
  --body "<h1>Hello!</h1><p>This is <strong>bold</strong>.</p>" \
  --html
```

**With CC and BCC:**
```bash
mailgoat send \
  --to user@example.com \
  --cc manager@example.com \
  --bcc archive@example.com \
  --subject "Team Update" \
  --body "..."
```

**With attachments:**
```bash
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "See attached files" \
  --attach report.pdf \
  --attach chart.png
```

**Multi-line body (bash):**
```bash
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "$(cat report.txt)"
```

**JSON output (for scripts):**
```bash
mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "Testing" \
  --json
```

### Output

**Human-readable (default):**
```
✓ Email sent successfully
Message ID: abc123def456
From: agent@example.com
To: user@example.com
Subject: Hello
```

**JSON (with `--json`):**
```json
{
  "success": true,
  "messageId": "abc123def456",
  "from": "agent@example.com",
  "to": ["user@example.com"],
  "subject": "Hello",
  "timestamp": "2026-02-15T16:00:00.000Z"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Email sent successfully |
| `1` | Invalid arguments (missing required options) |
| `2` | Authentication failed (invalid API key) |
| `3` | Network error (cannot reach server) |
| `4` | Postal API error (rate limit, server error, etc.) |

### Notes

- Body content can be plain text or HTML (with `--html` flag)
- Long bodies can be loaded from files: `--body "$(cat file.txt)"`
- Multiple `--to`, `--cc`, `--bcc` recipients can be specified
- Sender address must be allowed in Postal configuration

---

## read

Read an email message by its ID.

### Syntax

```bash
mailgoat read <message-id> [options]
```

### Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `message-id` | The unique message ID (required) | `abc123def456` |

### Optional Flags

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--html` | Show HTML content (if available) |

### Examples

**Read a message:**
```bash
mailgoat read abc123def456
```

**JSON output:**
```bash
mailgoat read abc123def456 --json
```

**Show HTML content:**
```bash
mailgoat read abc123def456 --html
```

### Output

**Human-readable (default):**
```
From: sender@example.com
To: agent@example.com
Subject: Test Message
Date: 2026-02-15 16:00:00 UTC

This is the email body.
```

**JSON (with `--json`):**
```json
{
  "id": "abc123def456",
  "from": "sender@example.com",
  "to": ["agent@example.com"],
  "subject": "Test Message",
  "date": "2026-02-15T16:00:00.000Z",
  "body": "This is the email body.",
  "html": "<p>This is the email body.</p>"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Message retrieved successfully |
| `1` | Invalid message ID format |
| `2` | Authentication failed |
| `3` | Network error |
| `4` | Message not found |

### Finding Message IDs

Message IDs can be obtained from:

1. **Send command output** - Returned when you send an email
2. **Postal web UI** - View messages in the dashboard
3. **Webhook-backed inbox** - `mailgoat inbox list` / `mailgoat inbox search`

### Notes

- Message IDs are typically alphanumeric strings (e.g., `abc123def456`)
- By default, shows plain text body. Use `--html` for HTML content
- Does not mark messages as "read" (no read/unread state in Postal)

---

## config

Manage MailGoat configuration.

### Syntax

```bash
mailgoat config <subcommand> [options]
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `init` | Interactive configuration setup |
| `show` | Display current configuration |
| `set` | Set a configuration value |
| `get` | Get a configuration value |

### config init

Interactive setup wizard.

```bash
mailgoat config init
```

Prompts for:
- Postal server URL
- Email address
- API key

Creates `~/.mailgoat/config.yml` with your settings.

### config show

Display current configuration (API key is masked).

```bash
mailgoat config show
```

Output:
```yaml
server: postal.example.com
email: agent@example.com
api_key: **********************def456
```

### config set

Set a specific configuration value.

```bash
mailgoat config set <key> <value>
```

Examples:
```bash
mailgoat config set server postal.example.com
mailgoat config set email agent@example.com
mailgoat config set api_key your-api-key-here
```

### config get

Get a specific configuration value.

```bash
mailgoat config get <key>
```

Examples:
```bash
mailgoat config get server
# Output: postal.example.com

mailgoat config get email
# Output: agent@example.com
```

### Configuration File Location

Default: `~/.mailgoat/config.yml`

Override with environment variable:
```bash
export MAILGOAT_CONFIG=/path/to/config.yml
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Configuration operation successful |
| `1` | Invalid arguments |
| `2` | Configuration file not found |
| `3` | Permission error (cannot write config) |

---

## version

Show MailGoat version information.

### Syntax

```bash
mailgoat version
mailgoat --version
mailgoat -v
```

### Output

```
mailgoat version 1.0.0
```

---

## Output Formats

### Human-Readable (Default)

Designed for terminal use by humans. Includes colors, formatting, and helpful messages.

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Output:
```
✓ Email sent successfully
Message ID: abc123
...
```

### JSON Mode

Designed for scripts, agents, and programmatic use. Outputs valid JSON on stdout.

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --json
```

Output:
```json
{"success": true, "messageId": "abc123", ...}
```

**Why use JSON mode?**
- Parse output with `jq` or programming languages
- Reliable structure for automation
- Error details in structured format
- No colors/formatting to strip

### Parsing JSON in Scripts

**Bash with jq:**
```bash
RESULT=$(mailgoat send --to user@example.com --subject "Test" --body "Hello" --json)
MESSAGE_ID=$(echo "$RESULT" | jq -r '.messageId')
echo "Sent message: $MESSAGE_ID"
```

**Python:**
```python
import subprocess
import json

result = subprocess.run(
    ['mailgoat', 'send', '--to', 'user@example.com', '--subject', 'Test', '--body', 'Hello', '--json'],
    capture_output=True,
    text=True
)
data = json.loads(result.stdout)
print(f"Message ID: {data['messageId']}")
```

**Node.js:**
```javascript
const { execSync } = require('child_process');
const output = execSync('mailgoat send --to user@example.com --subject "Test" --body "Hello" --json');
const data = JSON.parse(output);
console.log(`Message ID: ${data.messageId}`);
```

---

## Exit Codes

All MailGoat commands use consistent exit codes:

| Code | Meaning | Example |
|------|---------|---------|
| `0` | Success | Command completed successfully |
| `1` | Invalid arguments | Missing required option like `--to` |
| `2` | Authentication error | Invalid API key |
| `3` | Network error | Cannot reach Postal server |
| `4` | API error | Postal returned an error (rate limit, etc.) |
| `5` | File error | Cannot read/write config file |

### Using Exit Codes in Scripts

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "Email sent successfully"
elif [ $EXIT_CODE -eq 2 ]; then
  echo "Authentication failed - check API key"
elif [ $EXIT_CODE -eq 3 ]; then
  echo "Network error - check server connectivity"
else
  echo "Command failed with exit code $EXIT_CODE"
fi
```

---

## Environment Variables

MailGoat respects these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MAILGOAT_CONFIG` | Path to config file | `/etc/mailgoat/config.yml` |
| `MAILGOAT_SERVER` | Postal server URL | `postal.example.com` |
| `MAILGOAT_EMAIL` | Sender email address | `agent@example.com` |
| `MAILGOAT_API_KEY` | Postal API key | `your-api-key-here` |

**Precedence (highest to lowest):**
1. Command-line options
2. Environment variables
3. Config file
4. Defaults

**Example:**
```bash
export MAILGOAT_API_KEY=your-key-here
mailgoat send --to user@example.com --subject "Test" --body "Hello"
# Uses API key from environment variable
```

---

## Tips & Tricks

### 1. Alias for Common Commands

```bash
# Add to ~/.bashrc or ~/.zshrc
alias mg='mailgoat'
alias mgs='mailgoat send --json'
alias mgr='mailgoat read'
```

### 2. Send Email from File

```bash
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "$(cat report.txt)"
```

### 3. Pipeline Integration

```bash
# Send command output via email
ls -la | mailgoat send --to admin@example.com --subject "Directory Listing" --body "$(cat)"
```

### 4. Error Handling in Scripts

```bash
if ! mailgoat send --to user@example.com --subject "Test" --body "Hello" --json > /tmp/result.json; then
  echo "Send failed!"
  cat /tmp/result.json
  exit 1
fi
```

### 5. Multiple Profiles

Use different config files for different accounts:

```bash
MAILGOAT_CONFIG=~/.mailgoat/work.yml mailgoat send ...
MAILGOAT_CONFIG=~/.mailgoat/personal.yml mailgoat send ...
```

---

## See Also

- [Getting Started](getting-started.md) - Installation and setup
- [Configuration](configuration.md) - Config file details
- [Agent Integration](agent-integration.md) - Use MailGoat from agents
- [FAQ](faq.md) - Common questions
