# Getting Started with MailGoat

This guide will take you from zero to sending your first email in under 10 minutes.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** ≥ 18.0.0 installed
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **A Postal instance** with API credentials
   - Don't have one? See the [Self-Hosting Guide](self-hosting.md)
   - Already have Postal? Get your credentials from the Postal web UI

3. **Terminal/command line access**

## Installation

### Option 1: npm (Recommended)

```bash
npm install -g mailgoat
```

### Option 2: From Source

```bash
git clone https://github.com/opengoat/mailgoat.git
cd mailgoat
npm install
npm run build
npm link
```

### Verify Installation

```bash
mailgoat --version
```

You should see the version number (e.g., `1.0.0`).

## Initial Configuration

MailGoat stores configuration in `~/.mailgoat/config.yml`.

### Interactive Setup

The easiest way to configure MailGoat:

```bash
mailgoat config init
```

You'll be prompted for:
- **Postal server URL** (e.g., `postal.example.com`)
- **Your email address** (e.g., `agent@example.com`)
- **API key** (from Postal web UI)

### Manual Setup

Alternatively, create `~/.mailgoat/config.yml`:

```yaml
server: postal.example.com
email: agent@example.com
api_key: your-postal-api-key-here
```

**Getting your API key:**

1. Log into your Postal web UI (e.g., `https://postal.example.com`)
2. Navigate to your organization → Mail Servers → [Your Server]
3. Click "Credentials" in the sidebar
4. Create a new API credential
5. Copy the key (it will only be shown once!)

### Test Your Configuration

```bash
mailgoat config show
```

Should display your configuration (with API key masked).

## Send Your First Email

### Basic Send

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "Hello from MailGoat" \
  --body "This is my first email from the CLI!"
```

**Success!** You should see:

```
✓ Email sent successfully
Message ID: abc123def456
From: agent@example.com
To: recipient@example.com
Subject: Hello from MailGoat
```

### Send with JSON Output

For programmatic use (agents, scripts):

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "Test" \
  --body "Testing JSON mode" \
  --json
```

Output:

```json
{
  "success": true,
  "messageId": "abc123def456",
  "from": "agent@example.com",
  "to": ["recipient@example.com"],
  "subject": "Test"
}
```

### Send HTML Email

```bash
mailgoat send \
  --to recipient@example.com \
  --subject "HTML Test" \
  --body "<h1>Hello!</h1><p>This is <strong>HTML</strong> content.</p>" \
  --html
```

## Read Your First Email

### Read a Specific Message

If you know the message ID:

```bash
mailgoat read abc123def456
```

Output:

```
From: sender@example.com
To: agent@example.com
Subject: Test Message
Date: 2026-02-15 16:00:00 UTC

This is the email body.
```

### Read with JSON Output

```bash
mailgoat read abc123def456 --json
```

Output:

```json
{
  "id": "abc123def456",
  "from": "sender@example.com",
  "to": ["agent@example.com"],
  "subject": "Test Message",
  "date": "2026-02-15T16:00:00.000Z",
  "body": "This is the email body.",
  "html": null
}
```

### Finding Message IDs

Currently, MailGoat requires message IDs to read emails. You can get them from:

1. **Send command output** - When you send, the message ID is returned
2. **Postal web UI** - Browse messages in the Postal dashboard
3. **Webhooks** - Coming in Phase 2 (see [Roadmap](roadmap.md))

**Note:** Inbox listing (list all messages) is not yet available due to Postal API limitations. Webhook-based inbox management is planned for Phase 2.

## Common First-Time Issues

### "Connection refused" or "Cannot connect to server"

**Problem:** MailGoat can't reach your Postal server.

**Solutions:**
- Verify the server URL in your config (no `http://` or `https://` prefix)
- Check that Postal is running: `curl https://postal.example.com`
- Ensure port 443 is open on your firewall
- Verify DNS is resolving correctly: `nslookup postal.example.com`

### "Invalid API key" or "Authentication failed"

**Problem:** Your API key is incorrect or expired.

**Solutions:**
- Double-check the API key in your config (no extra spaces/newlines)
- Regenerate the API key in Postal web UI
- Run `mailgoat config init` to re-enter credentials
- Ensure you copied the full key (they're long!)

### "Sender address not allowed"

**Problem:** The email address in your config doesn't match Postal's allowed senders.

**Solutions:**
- Verify the email address in your config matches one in Postal
- Check Postal UI → Organization → Domains
- Ensure your domain is verified in Postal
- Try using a different email address from a verified domain

### Command not found: mailgoat

**Problem:** MailGoat CLI isn't in your PATH.

**Solutions:**
- If installed via npm: Run `npm install -g mailgoat` again
- If from source: Run `npm link` in the mailgoat directory
- Check PATH: `echo $PATH | grep npm`
- Try: `npx mailgoat` as an alternative

### "Rate limit exceeded"

**Problem:** You're sending too many emails too quickly.

**Solutions:**
- Add delays between sends in scripts: `sleep 1`
- Check Postal rate limit settings
- For high-volume needs, adjust Postal configuration

## Next Steps

Now that you're set up, explore more:

- **[CLI Reference](cli-reference.md)** - Learn all available commands
- **[Configuration](configuration.md)** - Multiple profiles, environment variables
- **[Agent Integration](agent-integration.md)** - Use MailGoat from scripts and agents
- **[Examples](https://github.com/opengoat/mailgoat/tree/main/examples)** - Real-world integration patterns

## Quick Reference

```bash
# Send email
mailgoat send --to EMAIL --subject SUBJECT --body BODY

# Send HTML email
mailgoat send --to EMAIL --subject SUBJECT --body HTML --html

# Read message
mailgoat read MESSAGE_ID

# JSON output (for scripts)
mailgoat send --to EMAIL --subject SUBJECT --body BODY --json

# Show config
mailgoat config show

# Get help
mailgoat --help
mailgoat send --help
```

## Get Help

Still stuck?

- Check the [FAQ](faq.md)
- Search [GitHub Issues](https://github.com/opengoat/mailgoat/issues)
- Ask in [Discord](https://discord.gg/mailgoat)
- Email: hello@mailgoat.ai
