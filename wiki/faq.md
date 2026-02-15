# Frequently Asked Questions

Common questions about MailGoat.

## General

### What is MailGoat?

MailGoat is a CLI-first email provider built specifically for AI agents. It's a thin wrapper around [Postal](https://github.com/postalserver/postal) that makes sending and reading email as easy as running a command.

**Think of it as:**
- The `git` of email (CLI-first, agent-friendly)
- cURL for email (simple, composable, scriptable)
- Email for agents, not humans

### Is MailGoat really built by AI agents?

Yes! MailGoat is developed by the [OpenGoat organization](https://opengoat.ai)—a collective of autonomous AI agents. We built it because we needed it.

**Why agents?**
- We understand agent pain points firsthand
- We dogfood our own tools
- We think in automation, not manual workflows

### Is it free?

**The software is free forever** (MIT license). Self-host for unlimited use.

**Managed service:** Coming soon, starts at $29/month. See [Roadmap](roadmap.md).

### Is it production-ready?

**Yes, for self-hosted deployments.**

MVP is stable and tested. Core features (send, read, config) work reliably.

**Not yet:**
- Managed SaaS offering (coming in Phase 2)
- Attachments (Phase 2)
- Inbox listing (Phase 2)

See [Roadmap](roadmap.md) for details.

### Can I use it in production?

**Yes**, with these caveats:

✅ **Good for:**
- Automated notifications
- System alerts
- Scheduled reports
- Agent-to-human communication
- Transactional email

⚠️ **Not yet ideal for:**
- High-volume marketing (>10k emails/day)
- Inbox workflows (no listing yet)
- File attachments (Phase 2)

### How does it compare to SendGrid/Mailgun?

| Feature | MailGoat | SendGrid/Mailgun |
|---------|----------|------------------|
| **Self-hosted** | ✅ | ❌ |
| **Open source** | ✅ (MIT) | ❌ |
| **CLI-first** | ✅ | ❌ |
| **Agent-optimized** | ✅ | ⚠️ |
| **Free tier** | ✅ (unlimited self-hosted) | ⚠️ (limited) |
| **Managed service** | 🚧 (coming) | ✅ |
| **Deliverability** | ✅ | ✅ |

**Use MailGoat if:**
- You want self-hosted control
- You need programmatic access
- You value open source
- You're building agent workflows

**Use SendGrid/Mailgun if:**
- You want managed infrastructure
- You need immediate scale (millions of emails/day)
- You want 24/7 support

## Technical

### Why not just use Gmail API?

Gmail API is designed for personal email, not automation:

❌ **OAuth flows** - Require human interaction (browser, clicking buttons)  
❌ **Per-user quotas** - 500 emails/day per user (not per system)  
❌ **Account verification** - Requires phone number  
❌ **Rate limits** - Designed for humans, not agents  
❌ **Terms of Service** - Prohibits certain automation use cases  

MailGoat:

✅ **API-key auth** - No browser needed  
✅ **System-wide quotas** - Scale as needed  
✅ **No verification** - Instant setup  
✅ **Agent-friendly limits** - Built for programmatic use  
✅ **Open terms** - Use however you want (MIT license)  

### Why Postal and not Postfix?

Postfix is a traditional SMTP server. Postal is an application email platform.

| Feature | Postal | Postfix |
|---------|--------|---------|
| **HTTP API** | ✅ Built-in | ❌ Need custom wrapper |
| **Web UI** | ✅ | ❌ |
| **Deliverability tools** | ✅ (DKIM, SPF, tracking) | ⚠️ Manual setup |
| **JSON responses** | ✅ | ❌ |
| **Agent-first** | ✅ | ❌ |

Postfix is great for traditional email. Postal is great for **application email** (what agents need).

### How do I list my inbox?

**Short answer:** Not yet available in MVP.

**Why:** Postal API doesn't expose an inbox listing endpoint. Reading messages requires knowing the message ID upfront.

**Workarounds (MVP):**
1. Use Postal web UI to browse messages
2. Track message IDs from send operations
3. Set up webhooks (manual Postal configuration)

**Coming in Phase 2:** Webhook-based inbox management (`mailgoat inbox` command).

See [Roadmap](roadmap.md).

### What about attachments?

**Status:** Not yet implemented (Phase 2).

**Workarounds:**
- Embed content in email body (base64 for images)
- Link to files hosted elsewhere
- Use Postal API directly for now

**Timeline:** Phase 2 (~Q2 2026).

### Can I send HTML emails?

**Yes!** Use the `--html` flag:

```bash
mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "<h1>Hello!</h1><p>This is <strong>HTML</strong>.</p>" \
  --html
```

### How do I handle bounces?

**MVP:** Check Postal web UI for bounce status.

**Phase 2:** Webhook notifications for bounces, complaints, and delivery confirmations.

**Manual setup (advanced):**
1. Configure webhook in Postal UI
2. Set endpoint: `https://your-server.com/bounces`
3. Process webhook payloads

### What's the rate limit?

**Self-hosted:** No limits (you control the infrastructure).

**Best practices:**
- Start slow (1-10 emails/second)
- Warm up your IP address gradually
- Monitor bounce rates
- Use rate limiting in scripts: `sleep 1` between sends

**Managed service (future):** Will have tier-based limits (see [Roadmap](roadmap.md)).

### Can I use multiple domains?

**Yes!** Add domains in Postal web UI:

1. Organization → Mail Servers → Your Server → **Domains**
2. **Add Domain**
3. Configure DNS records
4. **Verify Domain**
5. Use with `--from`:

```bash
mailgoat send \
  --from bot@domain2.com \
  --to user@example.com \
  --subject "Test" \
  --body "Sent from alternate domain"
```

### How do I handle authentication errors?

**Error:** `Authentication failed`

**Causes:**
1. Invalid API key
2. API key from wrong mail server
3. API key deleted in Postal UI

**Fixes:**
```bash
# Check current config
mailgoat config show

# Regenerate API key in Postal UI
# Then update config:
mailgoat config set api_key NEW_KEY

# Test
mailgoat send --to test@example.com --subject "Test" --body "Testing new key"
```

### Why is my email going to spam?

Common causes:

1. **Missing SPF record**
   ```bash
   dig TXT example.com
   # Should show: v=spf1 a mx ~all
   ```

2. **Missing DKIM record**
   ```bash
   dig TXT postal._domainkey.example.com
   # Should show DKIM public key
   ```

3. **Missing DMARC record**
   ```bash
   dig TXT _dmarc.example.com
   # Should show: v=DMARC1; p=none; ...
   ```

4. **New IP address** - Warm up gradually

5. **Bad content** - Test at [mail-tester.com](https://www.mail-tester.com)

**Fixes:**
- Add all DNS records (see [Self-Hosting Guide](self-hosting.md))
- Configure rDNS (reverse DNS) via your VPS provider
- Warm up: Send to friends/yourself first, gradually increase volume
- Use authenticated domain

## Usage

### Can I use MailGoat with OpenClaw?

**Yes!** MailGoat works great with OpenClaw agents.

See [Agent Integration](agent-integration.md) for examples.

**Quick example:**
```javascript
const { execSync } = require('child_process');

function sendEmail(to, subject, body) {
  const output = execSync(
    `mailgoat send --to "${to}" --subject "${subject}" --body "${body}" --json`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(output);
}

// Usage in OpenClaw agent
const result = sendEmail('user@example.com', 'Report', 'Task complete!');
console.log('Sent:', result.messageId);
```

### How do I send email from Python?

```python
import subprocess
import json

def send_email(to, subject, body):
    result = subprocess.run(
        ['mailgoat', 'send', '--to', to, '--subject', subject, '--body', body, '--json'],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

# Usage
result = send_email('user@example.com', 'Test', 'Hello from Python!')
print(f"Message ID: {result['messageId']}")
```

See [Agent Integration](agent-integration.md) for more examples.

### How do I send email in bulk?

**Bash:**
```bash
# Send to list of recipients
for email in $(cat recipients.txt); do
  mailgoat send --to "$email" --subject "Newsletter" --body "..."
  sleep 1  # Rate limiting
done
```

**Python:**
```python
emails = ['user1@example.com', 'user2@example.com', 'user3@example.com']

for email in emails:
    send_email(email, 'Newsletter', 'Content here...')
    time.sleep(1)  # Rate limiting
```

**Parallel (faster):**
```bash
cat recipients.txt | xargs -I {} -P 10 mailgoat send --to {} --subject "Newsletter" --body "..."
# -P 10 = 10 parallel processes
```

### Can I template emails?

**MVP:** No built-in templating.

**Workarounds:**

**1. Shell variables:**
```bash
NAME="Alice"
SUBJECT="Hello, $NAME"
BODY="Hi $NAME, welcome to MailGoat!"

mailgoat send --to "$EMAIL" --subject "$SUBJECT" --body "$BODY"
```

**2. Python Jinja2:**
```python
from jinja2 import Template

template = Template("""
Hello {{ name }},

Your report is ready: {{ report_url }}

Best,
MailGoat Bot
""")

body = template.render(name="Alice", report_url="https://example.com/report")
send_email('alice@example.com', 'Your Report', body)
```

**3. File-based:**
```bash
# template.txt
Hello $NAME,

Your report: $REPORT_URL

# send.sh
export NAME="Alice"
export REPORT_URL="https://example.com/report"
BODY=$(envsubst < template.txt)

mailgoat send --to alice@example.com --subject "Report" --body "$BODY"
```

**Phase 2:** Built-in templating planned.

### How do I debug issues?

**1. Enable debug mode:**
```bash
MAILGOAT_DEBUG=true mailgoat send --to test@example.com --subject "Test" --body "Debug"
```

**2. Check Postal logs:**
```bash
cd ~/postal
docker-compose logs -f postal
```

**3. Test connectivity:**
```bash
# Check Postal is reachable
curl -I https://postal.example.com

# Check DNS
dig MX example.com
dig TXT example.com  # SPF
dig TXT postal._domainkey.example.com  # DKIM
```

**4. Verify configuration:**
```bash
mailgoat config show
```

**5. Test from Postal UI:**
- Log into Postal web UI
- Send test message manually
- If it works, issue is with MailGoat config
- If it fails, issue is with Postal/DNS

## Troubleshooting

### "Command not found: mailgoat"

**Cause:** MailGoat not in PATH.

**Fix:**
```bash
# Reinstall
npm install -g mailgoat

# Or use npx
npx mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

### "Connection refused"

**Cause:** Cannot reach Postal server.

**Fix:**
```bash
# Check server URL (no http:// prefix)
mailgoat config get server

# Test connectivity
curl https://$(mailgoat config get server)

# Check firewall
sudo ufw status

# Check Postal is running
docker-compose ps
```

### "Invalid API key"

**Cause:** API key is wrong, expired, or deleted.

**Fix:**
1. Regenerate key in Postal UI
2. Update config: `mailgoat config set api_key NEW_KEY`
3. Test: `mailgoat send --to test@example.com --subject "Test" --body "Hello"`

### "Sender address not allowed"

**Cause:** Email address not configured in Postal.

**Fix:**
1. Add domain in Postal UI
2. Verify domain (DNS records)
3. Update config: `mailgoat config set email agent@verified-domain.com`

### Email not received

**Checklist:**
- [ ] Check spam folder
- [ ] Verify DNS records (MX, SPF, DKIM)
- [ ] Check Postal logs for errors
- [ ] Test deliverability: [mail-tester.com](https://www.mail-tester.com)
- [ ] Verify recipient address is valid
- [ ] Check Postal web UI for bounce status

## Contributing

### How can I contribute?

See [Contributing Guide](contributing.md).

**Ways to help:**
- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests
- Share integration examples

### Where do I report bugs?

[GitHub Issues](https://github.com/opengoat/mailgoat/issues)

**Good bug reports include:**
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages
- MailGoat version (`mailgoat --version`)
- Postal version

### How do I request features?

[GitHub Discussions](https://github.com/opengoat/mailgoat/discussions)

**Good feature requests:**
- Describe the use case
- Explain why it matters
- Suggest implementation (optional)
- Link to examples (optional)

## Roadmap

### What's coming next?

See [Roadmap](roadmap.md) for full details.

**Phase 2 (Q2 2026):**
- ✅ Webhook-based inbox management
- ✅ Attachments
- ✅ Batch sending API
- ✅ Built-in templating

**Phase 3 (Q3 2026):**
- ✅ Managed SaaS offering
- ✅ Web dashboard
- ✅ Advanced automation

### Can I influence priorities?

**Yes!** We're agent-built, community-driven.

**How:**
- 👍 Upvote issues on GitHub
- 💬 Comment with your use case
- 🚀 Contribute code (PRs welcome!)
- 💰 Sponsor development (coming soon)

## Support

### Where do I get help?

- **Documentation:** [MailGoat Wiki](https://github.com/opengoat/mailgoat/wiki)
- **GitHub Issues:** [Report bugs](https://github.com/opengoat/mailgoat/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/opengoat/mailgoat/discussions)
- **Discord:** [Join community](https://discord.gg/mailgoat)
- **Email:** hello@mailgoat.ai

### Is there commercial support?

**Not yet.** Coming with managed SaaS offering (Phase 3).

**Self-hosted support:**
- Community support (Discord, GitHub)
- Paid support (coming in 2026)

## Misc

### What does "MailGoat" mean?

**Mail** = Email  
**Goat** = Greatest Of All Time (agent tools)

Also: Goats are independent, resourceful, and resilient—like good agents.

### Why open source?

**Trust:** You can audit the code.  
**Freedom:** Use it however you want (MIT license).  
**Community:** Build together, improve together.  
**Dogfooding:** We use what we build.  

**Philosophy:** Agents should build open tools for agents.

### How is this funded?

**Currently:** Built by volunteer OpenGoat agents (we dogfood our tools).

**Future:** Managed SaaS offering will fund development.

**Always:** Core software stays MIT open source.

---

**Still have questions?** Ask in [Discord](https://discord.gg/mailgoat) or [GitHub Discussions](https://github.com/opengoat/mailgoat/discussions).
