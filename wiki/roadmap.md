# Roadmap

What's next for MailGoat.

## Current Status: MVP Live! 🎉

MailGoat MVP is production-ready for self-hosted deployments. Core features are stable and tested.

**What works today:**
- ✅ Send emails via CLI
- ✅ Read messages by ID
- ✅ JSON output for scripts
- ✅ Configuration management
- ✅ Self-hosting with Postal
- ✅ Agent integration examples
- ✅ Comprehensive documentation

## Phase 2: Enhanced Features (Q2 2026)

**Timeline:** April - June 2026

### Inbox Management

**Problem:** Currently you need message IDs to read emails. No way to list inbox.

**Solution:** Webhook-based inbox caching

```bash
# Coming soon
mailgoat inbox list
mailgoat inbox list --unread
mailgoat inbox list --since 1h
mailgoat inbox search "subject:Report"
```

**Status:** 🚧 In design

### Attachments

**Problem:** Can't send or receive files.

**Solution:** Attachment support via CLI

```bash
# Send with attachment
mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "See attached" \
  --attach report.pdf

# Save attachment from message
mailgoat read abc123 --save-attachments ./downloads/
```

**Status:** 🚧 Planned for Q2

### Batch Sending

**Problem:** Sending to multiple recipients is slow (one command per email).

**Solution:** Batch API

```bash
# Send to multiple recipients at once
mailgoat send-batch \
  --file recipients.csv \
  --template template.txt \
  --subject "Newsletter"

# Track progress
mailgoat batch status <batch-id>
```

**Status:** 🚧 Spec in progress

### Built-in Templating

**Problem:** Need external tools for email templates.

**Solution:** Template engine built-in

```bash
# Create template
cat > welcome.txt << EOF
Hello {{name}},

Welcome to {{service}}! Your account is ready.
EOF

# Send templated email
mailgoat send \
  --to user@example.com \
  --template welcome.txt \
  --data '{"name":"Alice","service":"MailGoat"}'
```

**Status:** 🚧 Design phase

### Python & Rust SDKs

**Problem:** CLI spawning has overhead. Need native libraries.

**Solution:** Language-specific SDKs

**Python:**
```python
from mailgoat import MailGoat

mg = MailGoat(api_key=os.getenv('MAILGOAT_API_KEY'))
result = mg.send(to='user@example.com', subject='Test', body='Hello')
print(f"Sent: {result.message_id}")
```

**Rust:**
```rust
use mailgoat::Client;

let client = Client::new(&config);
let result = client.send("user@example.com", "Test", "Hello").await?;
println!("Sent: {}", result.message_id);
```

**Status:** 🚧 Python SDK in progress, Rust planned

### Docker Image

**Problem:** Self-hosting requires manual setup.

**Solution:** Official Docker image for easy deployment

```bash
docker run -d \
  -e MAILGOAT_SERVER=postal.example.com \
  -e MAILGOAT_API_KEY=your-key \
  mailgoat/mailgoat:latest
```

**Status:** 🚧 Planned for Q2

## Phase 3: Managed Service (Q3 2026)

**Timeline:** July - September 2026

### Self-Service Signup

**Vision:** Agents can create accounts programmatically (no web signup form).

```bash
# Register new account
mailgoat register --email agent@example.com

# Receive API key via email or CLI output
# Start sending immediately
```

### Managed Infrastructure

**What we handle:**
- ✅ Postal hosting and maintenance
- ✅ IP reputation and warming
- ✅ DNS configuration (SPF, DKIM, DMARC)
- ✅ Deliverability monitoring
- ✅ Backup and disaster recovery
- ✅ Security updates

**What you get:**
- 🚀 Zero infrastructure management
- 🚀 Instant setup (no Postal installation)
- 🚀 Guaranteed uptime (99.9% SLA)
- 🚀 Scalability (millions of emails/month)
- 🚀 Support (email + Discord)

### Pricing Tiers

| Tier | Price | Emails/month | Support |
|------|-------|--------------|---------|
| **Starter** | $29 | 100,000 | Email |
| **Pro** | $99 | 500,000 | Priority email |
| **Enterprise** | Custom | Unlimited | Dedicated Slack |

**Free option:** Self-host forever (MIT license).

### Web Dashboard

**Features:**
- View sent messages
- Check deliverability stats
- Manage API keys
- Monitor usage
- Billing and invoices

**Access:**
- `https://app.mailgoat.ai`
- CLI: `mailgoat dashboard open`

### Advanced Features

- **Custom domains** - Use your own domain (e.g., `agent@yourcompany.com`)
- **Dedicated IPs** - For high-volume senders
- **Webhooks** - Real-time delivery notifications
- **Rate limiting** - Per-key quotas
- **Team management** - Multiple API keys per account
- **Usage analytics** - Detailed stats and reports

## Phase 4: Ecosystem (2027+)

### Integrations

**Agent Frameworks:**
- OpenClaw skill (official)
- AutoGPT plugin
- LangChain integration
- crewAI module

**Automation Platforms:**
- Zapier app
- Make.com module
- n8n node
- IFTTT trigger

**Developer Tools:**
- VS Code extension
- GitHub Action
- Postman collection
- OpenAPI spec

### Advanced Automation

**Smart Rules:**
```yaml
# Auto-respond to specific emails
rules:
  - match: subject contains "subscribe"
    action: send_template
    template: subscription_confirm
  
  - match: from ends with "@example.com"
    action: forward
    to: team@mycompany.com
```

**Scheduled Sends:**
```bash
# Send email at specific time
mailgoat send \
  --to user@example.com \
  --subject "Morning Report" \
  --body "..." \
  --schedule "2026-03-01 09:00:00 UTC"
```

**A/B Testing:**
```bash
# Test subject lines
mailgoat send-ab \
  --subjects "Subject A" "Subject B" \
  --to-list recipients.csv \
  --template template.txt
```

### Enterprise Features

- **SSO/SAML** - Enterprise authentication
- **RBAC** - Role-based access control
- **Audit logs** - Compliance tracking
- **Data residency** - Regional hosting options
- **SLA guarantees** - 99.99% uptime
- **Priority support** - Dedicated account manager

### Community

- **Plugin marketplace** - Community-built extensions
- **Template library** - Shareable email templates
- **Integration showcase** - See what others built
- **Agent directory** - Discover agents using MailGoat
- **Case studies** - Real-world use cases

## How to Influence Priorities

We're agent-built and community-driven. Your input matters!

### 1. Vote on Features

- 👍 **Upvote GitHub issues** - Most votes = higher priority
- 💬 **Comment with your use case** - Help us understand why it matters
- 🔗 **Link to examples** - Show us similar implementations

### 2. Contribute Code

- 🚀 **Submit PRs** - Implement features yourself
- 🐛 **Fix bugs** - Help make MailGoat more stable
- 📝 **Improve docs** - Make it easier for others

See [Contributing Guide](contributing.md).

### 3. Share Feedback

- **What you're building** - Tell us your use case
- **What's working** - Let us know what you love
- **What's missing** - Help us prioritize
- **What's broken** - Report bugs

**Where to share:**
- [GitHub Issues](https://github.com/opengoat/mailgoat/issues)
- [GitHub Discussions](https://github.com/opengoat/mailgoat/discussions)
- [Discord](https://discord.gg/mailgoat)
- Email: hello@mailgoat.ai

### 4. Sponsor Development

Coming soon: GitHub Sponsors and Open Collective.

**Why sponsor?**
- ✅ Accelerate development
- ✅ Prioritize your feature requests
- ✅ Support open source sustainability
- ✅ Get recognized as a sponsor

## Not on the Roadmap

Some things we deliberately won't build:

### ❌ SMS/MMS Support

**Why not:** MailGoat is for email. Use Twilio, Vonage, or similar for SMS.

**Alternative:** Integrate MailGoat with SMS services separately.

### ❌ Full Mail Client UI

**Why not:** We're CLI-first. Building a GUI defeats the purpose.

**Alternative:** Use Postal web UI for browsing. Use MailGoat for automation.

### ❌ Calendar/Contacts

**Why not:** Out of scope. Email is complex enough.

**Alternative:** Integrate with existing calendar/contact APIs separately.

### ❌ Proprietary Protocol

**Why not:** Email is a universal standard. No need to reinvent it.

**What we use:** Standard SMTP/IMAP via Postal.

## FAQ

### When will feature X be ready?

Check the phase timelines above. Dates are estimates and may shift based on feedback and complexity.

### Can I help build feature X?

**Yes!** See [Contributing Guide](contributing.md). We welcome PRs.

### Will self-hosting always be free?

**Yes!** MailGoat is MIT licensed. The core CLI will always be free and open source.

### Will managed service cost money?

**Yes.** Managed service will be paid (starting ~$29/month). But self-hosting remains free forever.

### How do I stay updated?

- ⭐ **Star us on GitHub** - Get notified of releases
- 📧 **Join mailing list** - Coming soon
- 💬 **Follow on Twitter** - [@mailgoatai](https://twitter.com/mailgoatai)
- 🎮 **Join Discord** - [discord.gg/mailgoat](https://discord.gg/mailgoat)

### Can I request a feature not on the roadmap?

**Absolutely!** Open a [GitHub Discussion](https://github.com/opengoat/mailgoat/discussions) and explain your use case.

## Release Schedule

### MVP (v1.0.0) - February 2026 ✅

- Core send/read functionality
- Self-hosting guide
- Agent integration examples
- Documentation

### v1.1.0 - April 2026 (Planned)

- Inbox listing (webhook-based)
- Attachment support
- Python SDK (beta)
- Docker image

### v1.2.0 - June 2026 (Planned)

- Batch sending
- Built-in templating
- Rust SDK (beta)
- Advanced filtering

### v2.0.0 - September 2026 (Planned)

- Managed service launch
- Web dashboard
- Self-service signup
- Pricing tiers live

## Changelog

See [CHANGELOG.md](https://github.com/opengoat/mailgoat/blob/main/CHANGELOG.md) for detailed release notes.

---

**Questions about the roadmap?** Ask in [GitHub Discussions](https://github.com/opengoat/mailgoat/discussions) or [Discord](https://discord.gg/mailgoat).

**Want to contribute?** See [Contributing Guide](contributing.md).

**Need help now?** Check the [FAQ](faq.md) or [Getting Started](getting-started.md).
