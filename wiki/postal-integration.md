# Postal Integration

Understanding how MailGoat uses Postal for email infrastructure.

## What is Postal?

[Postal](https://github.com/postalserver/postal) is an open-source mail server designed for application email. It's the backend that powers MailGoat.

**Why Postal?**
- 📧 Full-featured mail server (send, receive, routing)
- 🔑 API-first design (perfect for MailGoat)
- 🏠 Self-hostable (MIT license)
- 📊 Built-in deliverability tools (SPF, DKIM, DMARC)
- 🎯 Designed for application email, not personal mailboxes

## How MailGoat Uses Postal

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   MailGoat   │  HTTP   │    Postal    │  SMTP   │  Recipient   │
│     CLI      │────────>│     API      │────────>│  Mail Server │
└──────────────┘         └──────────────┘         └──────────────┘
                              │
                              │ Stores messages
                              ▼
                         ┌──────────────┐
                         │   Database   │
                         │  (MariaDB)   │
                         └──────────────┘
```

**MailGoat is a thin wrapper** around Postal's HTTP API:
- `mailgoat send` → Postal `/api/v1/send/message`
- `mailgoat read` → Postal `/api/v1/messages/{id}`
- `mailgoat config` → Local file management (no API call)

## Postal Concepts

### Organizations

**What:** Top-level container for everything in Postal.

**Purpose:** Multi-tenancy. Different teams/projects can have separate organizations.

**MailGoat usage:** You typically have one organization for your MailGoat deployment.

### Mail Servers

**What:** A logical mail server within an organization.

**Purpose:** Separate email streams (e.g., transactional vs marketing).

**MailGoat usage:** Create one mail server per project or environment.

**Example:**
- `production` - Production emails
- `staging` - Testing
- `notifications` - System alerts

### Domains

**What:** Email domains you can send from (e.g., `example.com`).

**Purpose:** Define which addresses you're allowed to send from.

**MailGoat usage:** Add your domain to send from `agent@example.com`.

### Credentials

**What:** API keys for authenticating requests.

**Purpose:** Secure access to Postal API.

**MailGoat usage:** The API key in `~/.mailgoat/config.yml`.

## Getting API Credentials

### Step 1: Access Postal Web UI

Open `https://postal.example.com` in your browser.

### Step 2: Navigate to Your Mail Server

1. Log in with your admin credentials
2. Click on your organization (e.g., "My Organization")
3. Click on your mail server (e.g., "Main Mail Server")

### Step 3: Create API Credential

1. In the sidebar, click **"Credentials"**
2. Click **"Create Credential"**
3. Configure:
   - **Name:** `mailgoat-cli` (or any descriptive name)
   - **Type:** API Key
   - **Permissions:** Send Messages, Read Messages
4. Click **"Create"**
5. **Copy the API key** (shown only once!)

Example key: `proj_abc123...xyz789`

### Step 4: Configure MailGoat

```bash
mailgoat config set api_key proj_abc123...xyz789
```

Or add to `~/.mailgoat/config.yml`:

```yaml
api_key: proj_abc123...xyz789
```

## Postal UI Walkthrough

### Dashboard

**Location:** Home page after login

**Shows:**
- Organization overview
- Mail servers
- Quick stats (sent, bounced, held)
- Recent activity

**Actions:**
- Create mail server
- View organizations
- Access admin settings

### Organizations

**Location:** Sidebar → Organizations

**Shows:**
- List of all organizations
- Each organization's mail servers

**Actions:**
- Create organization
- Edit organization settings
- Manage IP pools
- Configure domains globally

### Mail Servers

**Location:** Organization → Mail Servers

**Shows:**
- Server name and ID
- Sending statistics
- Domains configured
- Current status

**Actions:**
- Create mail server
- View server settings
- Manage credentials
- Configure sending rules

### Domains

**Location:** Mail Server → Domains

**Shows:**
- Configured domains (e.g., `example.com`)
- Verification status
- DNS records needed
- DKIM/SPF status

**Actions:**
- Add domain
- Verify domain (via DNS)
- View DNS records
- Remove domain

**DNS Requirements:**

After adding a domain, Postal shows DNS records you need to create:

```
Type: TXT
Name: postal-verification.example.com
Value: [verification token]

Type: TXT
Name: postal._domainkey.example.com
Value: [DKIM public key]

Type: TXT
Name: example.com
Value: v=spf1 a mx ~all
```

### Messages

**Location:** Mail Server → Messages

**Shows:**
- List of sent messages
- Message status (sent, bounced, held)
- Recipients, subjects, timestamps
- Message IDs

**Actions:**
- View message details
- View raw message
- View delivery logs
- Search messages

**MailGoat usage:** Find message IDs here to use with `mailgoat read`.

### Credentials

**Location:** Mail Server → Credentials

**Shows:**
- API keys and SMTP credentials
- Creation date
- Last used timestamp
- Permissions

**Actions:**
- Create credential (API or SMTP)
- View credential details
- Delete credential
- Manage permissions

**MailGoat usage:** This is where you get your API key for `~/.mailgoat/config.yml`.

### Routes

**Location:** Mail Server → Routes

**Shows:**
- Incoming email routing rules
- Domains accepting email
- Endpoint configurations (webhooks, HTTP, SMTP)

**Actions:**
- Create route
- Configure webhooks
- Set up forwarding
- Test routes

**MailGoat usage:** (Phase 2) Configure webhooks to receive emails.

### IP Pools

**Location:** Organization → IP Pools

**Shows:**
- Sending IP addresses
- IP reputation
- Pool assignments

**Actions:**
- Add IP address
- Assign IPs to mail servers
- Monitor reputation
- Configure rDNS

**MailGoat usage:** For advanced sending setups with multiple IPs.

## Common Tasks

### Add a New Domain

1. Mail Server → **Domains** → **Add Domain**
2. Enter domain name (e.g., `example.com`)
3. Copy DNS records from Postal UI
4. Create DNS records in your DNS provider
5. Wait for DNS propagation (5-15 minutes)
6. Click **Verify Domain** in Postal UI

### Verify Domain

Check DNS records are correct:

```bash
# Check MX record
dig MX example.com

# Check SPF record
dig TXT example.com

# Check DKIM record
dig TXT postal._domainkey.example.com
```

Verify in Postal UI:
- Domain → **Verification** → **Verify Now**

### Rotate API Key

1. Credentials → **Create Credential**
2. Copy new API key
3. Update MailGoat config: `mailgoat config set api_key NEW_KEY`
4. Test: `mailgoat send --to test@example.com --subject "Test" --body "Testing new key"`
5. Delete old credential in Postal UI

### View Sent Message

1. Messages → Find your message
2. Click message row
3. View details:
   - Headers
   - Body (HTML/plain text)
   - Delivery status
   - SMTP logs

Use message ID with MailGoat:
```bash
mailgoat read <message-id>
```

### Check Deliverability

Postal shows delivery status for each message:

- ✅ **Sent** - Successfully delivered
- 📬 **Held** - Queued for retry
- ⚠️ **Soft Bounce** - Temporary failure (will retry)
- ❌ **Hard Bounce** - Permanent failure (bad address)
- 📧 **Delivered** - Confirmed delivery

### Monitor Reputation

1. Organization → **IP Pools**
2. View IP reputation scores
3. Check blacklist status
4. Review bounce rates

**Healthy metrics:**
- Bounce rate < 5%
- Complaint rate < 0.1%
- No blacklists

### Set Up Webhook (Future)

Coming in Phase 2:

1. Mail Server → **Routes** → **Create Route**
2. Select domain to receive on
3. Set endpoint: `Webhook → https://your-agent.com/inbox`
4. Configure filters (optional)
5. Test with: `echo "test" | mail route@example.com`

## API vs SMTP

Postal offers two ways to send email:

### API (MailGoat uses this)

**Pros:**
- ✅ Simpler authentication (API key)
- ✅ Structured responses (JSON)
- ✅ Better error handling
- ✅ Built for programmatic access

**Cons:**
- ❌ Requires HTTP client
- ❌ Non-standard (Postal-specific)

**MailGoat usage:**
```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
# → HTTP POST to Postal API
```

### SMTP (Traditional)

**Pros:**
- ✅ Universal standard
- ✅ Works with any email client
- ✅ More compatible with legacy systems

**Cons:**
- ❌ More complex authentication
- ❌ Text-based protocol (harder to parse)
- ❌ Less detailed error messages

**Not used by MailGoat** (but available in Postal if you need it).

## Postal vs MailGoat

| Feature | Postal | MailGoat |
|---------|--------|----------|
| **Purpose** | Full mail server | CLI wrapper |
| **Interface** | Web UI + API | Command line |
| **Target user** | System admins | AI agents / developers |
| **Installation** | Docker compose | `npm install -g` |
| **Configuration** | Web UI | `~/.mailgoat/config.yml` |
| **Use case** | Infrastructure | Daily usage |

**Think of it like:**
- Postal = MySQL (the database server)
- MailGoat = mysql CLI (the command-line client)

## Troubleshooting Postal Issues

### Cannot Access Web UI

```bash
# Check Postal is running
docker-compose ps

# Check logs
docker-compose logs postal

# Restart Postal
docker-compose restart postal
```

### Domain Verification Failing

```bash
# Check DNS records
dig TXT postal-verification.example.com
dig TXT postal._domainkey.example.com

# Wait for propagation (can take 15+ minutes)
# Then try verification again
```

### API Key Not Working

- Verify key has correct permissions (Send, Read)
- Check key hasn't expired
- Ensure key is from the correct mail server
- Regenerate key if needed

### Messages Not Sending

1. Check Postal logs: `docker-compose logs postal`
2. Verify domain is verified
3. Check sender address is allowed
4. Test from Postal UI first
5. Check DNS configuration (MX, SPF, DKIM)

## See Also

- [Self-Hosting Guide](self-hosting.md) - Install Postal
- [Configuration](configuration.md) - Configure MailGoat with API key
- [Getting Started](getting-started.md) - Connect MailGoat to Postal
- [Postal Documentation](https://docs.postalserver.io/) - Official Postal docs
