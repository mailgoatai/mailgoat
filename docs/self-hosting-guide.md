# MailGoat Self-Hosting Guide

**Estimated time to complete:** 30 minutes

This guide will walk you through setting up your own Postal mail server and connecting it to MailGoat CLI. By the end, you'll have a fully functional email system for AI agents running on your own infrastructure.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites](#prerequisites)
3. [Installing Postal](#installing-postal)
4. [DNS Configuration](#dns-configuration)
5. [Initial Setup](#initial-setup)
6. [MailGoat CLI Integration](#mailgoat-cli-integration)
7. [Testing Your Setup](#testing-your-setup)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## System Requirements

**Minimum Requirements:**
- **CPU:** 2 cores
- **RAM:** 2 GB minimum, 4 GB recommended
- **Disk:** 20 GB minimum, 50+ GB for production use
- **OS:** Linux (Ubuntu 20.04+ or Debian 11+ recommended)
- **Network:** Static IP address, open ports (see below)

**Required Ports:**
- `25` - SMTP (receiving mail)
- `80` - HTTP (for Let's Encrypt, redirects to HTTPS)
- `443` - HTTPS (web interface)
- `587` - SMTP submission (optional, for clients)

**Note:** If you're running on a VPS, most providers block port 25 by default to prevent spam. You'll need to request it be unblocked (AWS, DigitalOcean, Linode all require this).

---

## Prerequisites

Before starting, ensure you have:

1. **Docker & Docker Compose installed**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # Log out and back in for group changes to take effect
   ```

2. **A domain name** you control (e.g., `example.com`)

3. **DNS access** to create records for your domain

4. **Root or sudo access** on your server

5. **Basic familiarity** with Linux command line, Docker, and DNS

---

## Installing Postal

### Step 1: Create Installation Directory

```bash
mkdir -p ~/postal
cd ~/postal
```

### Step 2: Download Postal

```bash
# Clone the Postal repository
git clone https://github.com/postalserver/postal.git
cd postal

# Use the latest stable version
git checkout stable
```

### Step 3: Create Docker Compose Configuration

Create a `docker-compose.yml` file for your deployment:

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # MariaDB - Main database
  mariadb:
    image: mariadb:10.11
    container_name: postal-mariadb
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MARIADB_DATABASE: postal
      MARIADB_USER: postal
      MARIADB_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mariadb-data:/var/lib/mysql
    networks:
      - postal

  # RabbitMQ - Message queue
  rabbitmq:
    image: rabbitmq:3.12-management
    container_name: postal-rabbitmq
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: postal
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - postal

  # Postal - Main application
  postal:
    image: ghcr.io/postalserver/postal:3.3.2
    container_name: postal-app
    restart: unless-stopped
    depends_on:
      - mariadb
      - rabbitmq
    ports:
      - "25:25"     # SMTP
      - "80:5000"   # HTTP (web interface)
      - "443:5000"  # HTTPS (if using reverse proxy)
    environment:
      # Database
      MAIN_DB_HOST: mariadb
      MAIN_DB_PORT: 3306
      MAIN_DB_USERNAME: postal
      MAIN_DB_PASSWORD: ${DB_PASSWORD}
      MAIN_DB_DATABASE: postal
      
      MESSAGE_DB_HOST: mariadb
      MESSAGE_DB_PORT: 3306
      MESSAGE_DB_USERNAME: postal
      MESSAGE_DB_PASSWORD: ${DB_PASSWORD}
      
      # RabbitMQ
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USERNAME: postal
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      RABBITMQ_VHOST: postal
      
      # Web interface
      POSTAL_WEB_HOSTNAME: ${POSTAL_HOSTNAME}
      POSTAL_WEB_PROTOCOL: https
      
      # SMTP
      POSTAL_SMTP_HOSTNAME: ${POSTAL_HOSTNAME}
      
      # DNS settings (update these with your domain)
      DNS_MX_RECORDS: '["mx1.${POSTAL_DOMAIN}", "mx2.${POSTAL_DOMAIN}"]'
      DNS_SPF_INCLUDE: spf.${POSTAL_DOMAIN}
      DNS_RETURN_PATH_DOMAIN: rp.${POSTAL_DOMAIN}
      DNS_ROUTE_DOMAIN: routes.${POSTAL_DOMAIN}
      DNS_TRACK_DOMAIN: track.${POSTAL_DOMAIN}
      DNS_DKIM_IDENTIFIER: postal
      
      # Security
      RAILS_SECRET_KEY: ${RAILS_SECRET_KEY}
      POSTAL_SIGNING_KEY_PATH: /config/signing.key
      
      # Other
      RAILS_ENVIRONMENT: production
      LOGGING_ENABLED: "true"
    volumes:
      - postal-config:/config
      - postal-data:/postal-data
    networks:
      - postal

volumes:
  mariadb-data:
  rabbitmq-data:
  postal-config:
  postal-data:

networks:
  postal:
    driver: bridge
EOF
```

### Step 4: Create Environment File

Create a `.env` file with secure passwords:

```bash
cat > .env << EOF
# Database passwords
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)

# RabbitMQ password
RABBITMQ_PASSWORD=$(openssl rand -base64 32)

# Rails secret (must be 128+ characters)
RAILS_SECRET_KEY=$(openssl rand -hex 64)

# Your domain configuration
POSTAL_HOSTNAME=postal.example.com
POSTAL_DOMAIN=example.com
EOF
```

**Important:** Replace `example.com` with your actual domain!

```bash
# Edit the file
nano .env
# Update POSTAL_HOSTNAME and POSTAL_DOMAIN to your real domain
```

### Step 5: Generate Signing Key

```bash
# Create config directory
docker run --rm -v postal-config:/config ghcr.io/postalserver/postal:3.3.2 \
  sh -c "openssl genrsa -out /config/signing.key 2048 && chmod 644 /config/signing.key"
```

### Step 6: Initialize Database

```bash
# Start database services
docker-compose up -d mariadb rabbitmq

# Wait for databases to be ready (30 seconds)
sleep 30

# Run migrations
docker-compose run --rm postal postal initialize
```

### Step 7: Create Admin User

```bash
# Create the first admin user
docker-compose run --rm postal postal make-user

# Follow prompts to create:
# - Email: admin@example.com
# - First name: Admin
# - Last name: User
# - Password: (choose a strong password)
```

### Step 8: Start Postal

```bash
# Start all services
docker-compose up -d

# Check logs to ensure everything started correctly
docker-compose logs -f postal
```

You should see log messages indicating Postal has started successfully. Press `Ctrl+C` to exit log viewing.

---

## DNS Configuration

Proper DNS setup is **critical** for email deliverability. Missing or incorrect DNS records will cause your emails to be rejected or marked as spam.

### Overview of Required Records

```
┌────────────────────────────────────────────────────┐
│                  DNS Records                       │
│                                                    │
│  MX     → Where to send mail for your domain      │
│  A      → IP address of your mail server          │
│  SPF    → Authorized sending servers              │
│  DKIM   → Email signing key                       │
│  PTR    → Reverse DNS (from your hosting provider)│
│  DMARC  → Policy for authentication failures      │
└────────────────────────────────────────────────────┘
```

### Step 1: A Record (Web Interface)

Point your Postal hostname to your server's IP:

```
Record Type: A
Name: postal
Value: 203.0.113.10
TTL: 3600
```

**Result:** `postal.example.com` → `203.0.113.10`

### Step 2: MX Records (Receiving Mail)

Tell the world where to send email for your domain:

```
Record Type: MX
Name: @ (or blank, meaning example.com)
Value: mx1.example.com
Priority: 10
TTL: 3600
```

Also create the A records for your MX hostnames:

```
Record Type: A
Name: mx1
Value: 203.0.113.10
TTL: 3600

Record Type: A
Name: mx2
Value: 203.0.113.10
TTL: 3600
```

### Step 3: SPF Record (Sender Authorization)

SPF tells receiving servers which IPs can send mail for your domain:

```
Record Type: TXT
Name: @
Value: v=spf1 include:spf.example.com ~all
TTL: 3600
```

Then create the SPF include record:

```
Record Type: TXT
Name: spf
Value: v=spf1 ip4:203.0.113.10 ~all
TTL: 3600
```

**Explanation:**
- `v=spf1` - SPF version 1
- `include:spf.example.com` - Include records from this subdomain
- `ip4:203.0.113.10` - Your server's IP is authorized
- `~all` - Soft fail for everything else (good for testing)

### Step 4: DKIM Record (Email Signing)

DKIM cryptographically signs your emails to prove they're legitimate.

**Get your DKIM key from Postal:**
1. Log into Postal web UI at `https://postal.example.com`
2. Navigate to your organization
3. Go to "Mail Servers" → (your server)
4. Click "DNS Records"
5. Copy the DKIM public key (looks like `postal-dkim._domainkey`)

Create the DKIM DNS record:

```
Record Type: TXT
Name: postal-dkim._domainkey
Value: v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMI...
TTL: 3600
```

**Note:** The actual public key will be much longer - copy it exactly from Postal.

### Step 5: Return Path Domain

```
Record Type: CNAME
Name: rp
Value: postal.example.com
TTL: 3600
```

### Step 6: DMARC Record (Optional but Recommended)

DMARC tells receivers what to do if SPF or DKIM fail:

```
Record Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@example.com
TTL: 3600
```

**Explanation:**
- `p=none` - Don't reject, just report (start here)
- `rua=mailto:dmarc@example.com` - Send reports here
- Later, change to `p=quarantine` or `p=reject` once confident

### Step 7: PTR Record (Reverse DNS)

PTR records must be set by your hosting provider (AWS, DigitalOcean, etc.).

**Request from your provider:**
- PTR record: `203.0.113.10` → `postal.example.com`

This ensures reverse DNS lookups match your forward DNS.

### DNS Configuration Examples by Provider

#### Cloudflare
1. Log into Cloudflare dashboard
2. Select your domain
3. Go to "DNS" section
4. Click "Add record" for each entry above
5. **Important:** Set "Proxy status" to "DNS only" (gray cloud) for MX and mail-related records

#### Namecheap
1. Log into Namecheap
2. Go to "Domain List" → Manage
3. Click "Advanced DNS"
4. Add records using "Add New Record" button

#### Route53 (AWS)
1. Open Route53 console
2. Select hosted zone for your domain
3. Click "Create record"
4. Use "Simple routing" for most records

### Verify DNS Configuration

Wait 5-10 minutes for DNS propagation, then verify:

```bash
# Check MX records
dig MX example.com

# Check SPF
dig TXT example.com

# Check DKIM
dig TXT postal-dkim._domainkey.example.com

# Check A record
dig A postal.example.com
```

**Online tools:**
- MXToolbox: https://mxtoolbox.com/SuperTool.aspx
- DNS Checker: https://dnschecker.org

---

## Initial Setup

Now that Postal is running and DNS is configured, let's set up your first mail server.

### Step 1: Access Web Interface

Navigate to your Postal instance:
```
https://postal.example.com
```

Log in with the admin credentials you created earlier.

### Step 2: Create Organization

1. Click **"Organizations"** in the top menu
2. Click **"New Organization"**
3. Fill in:
   - **Name:** Your Organization
   - **Short Name:** `yourorg` (lowercase, no spaces)
4. Click **"Create Organization"**

### Step 3: Create Mail Server

1. Inside your organization, click **"Mail Servers"**
2. Click **"New Mail Server"**
3. Fill in:
   - **Name:** Production
   - **Mode:** Live
   - **Domains:** `example.com` (your domain)
4. Click **"Create Mail Server"**

### Step 4: Verify Domain

1. In your mail server, go to **"Domains"** tab
2. Click on your domain (`example.com`)
3. Click **"Check Now"** to verify DNS records
4. Ensure all checks pass (green checkmarks):
   - ✓ MX records
   - ✓ SPF record
   - ✓ DKIM record
   - ✓ Return path

**If any fail:** Double-check your DNS configuration and wait a few more minutes for propagation.

### Step 5: Generate API Credentials

These credentials will be used by MailGoat CLI:

1. In your mail server, click **"Credentials"** tab
2. Click **"New Credential"**
3. Fill in:
   - **Name:** MailGoat CLI
   - **Type:** API
4. Click **"Create Credential"**
5. **Important:** Copy the credential key - you won't see it again!

It will look like: `your-server-name_AbCdEfGh123456789`

### Step 6: Test Email Sending (Optional)

Test sending directly from Postal UI:

1. In your mail server, click **"Send Message"** in the sidebar
2. Fill in:
   - **From:** `test@example.com`
   - **To:** your personal email
   - **Subject:** Test from Postal
   - **Plain Body:** This is a test message
3. Click **"Send Message"**
4. Check your personal email inbox (and spam folder)

---

## MailGoat CLI Integration

Now connect MailGoat CLI to your Postal instance.

### Step 1: Install MailGoat CLI

**Option A: Docker (Recommended)**

No Node.js installation required! Use the official Docker image:

```bash
# Pull the latest image
docker pull mailgoatai/mailgoat:latest

# Create an alias for convenience
echo 'alias mailgoat="docker run --rm -e MAILGOAT_SERVER -e MAILGOAT_API_KEY -e MAILGOAT_FROM_ADDRESS mailgoatai/mailgoat:latest"' >> ~/.bashrc
source ~/.bashrc

# Or use docker-compose (see docker-compose.yml in the repo)
```

**Benefits:**
- ✅ No dependencies to install
- ✅ Consistent environment
- ✅ Easy updates: `docker pull mailgoatai/mailgoat:latest`
- ✅ Works on any platform (Linux, macOS, Windows)

**Option B: npm**

```bash
# Install via npm (requires Node.js 18+)
npm install -g mailgoat

# Or download binary (coming soon)
# curl -L https://github.com/mailgoat/cli/releases/latest/download/mailgoat-linux -o mailgoat
# chmod +x mailgoat
# sudo mv mailgoat /usr/local/bin/
```

### Step 2: Configure MailGoat

**If using Docker (recommended):**

Use environment variables instead of a config file:

```bash
# Set environment variables (add to ~/.bashrc or .env file)
export MAILGOAT_SERVER="https://postal.example.com"
export MAILGOAT_API_KEY="your-server-name_AbCdEfGh123456789"
export MAILGOAT_FROM_ADDRESS="agent@example.com"
export MAILGOAT_FROM_NAME="AI Agent"
```

Or use a `.env` file with docker-compose:

```bash
# Create .env file
cat > .env <<EOF
MAILGOAT_SERVER=https://postal.example.com
MAILGOAT_API_KEY=your-server-name_AbCdEfGh123456789
MAILGOAT_FROM_ADDRESS=agent@example.com
MAILGOAT_FROM_NAME=AI Agent
EOF
```

**If using npm installation:**

Create the configuration file:

```bash
mkdir -p ~/.mailgoat
nano ~/.mailgoat/config.yml
```

Add your Postal connection details:

```yaml
# ~/.mailgoat/config.yml
version: 1

# Your Postal server details
server:
  url: https://postal.example.com
  api_key: your-server-name_AbCdEfGh123456789  # From Step 5 above

# Your email identity
identity:
  from: agent@example.com
  name: AI Agent

# Optional: Webhook for incoming mail notifications
# webhook:
#   url: http://localhost:3000/webhooks/mail
#   secret: your-webhook-secret

# Optional: Polling interval for checking new mail
polling:
  enabled: true
  interval: 60  # seconds
```

**Important:** Replace these values:
- `url` / `MAILGOAT_SERVER` - Your Postal instance URL
- `api_key` / `MAILGOAT_API_KEY` - The credential you generated in Initial Setup Step 5
- `from` / `MAILGOAT_FROM_ADDRESS` - An email address on your domain

### Step 3: Verify Configuration

Test the connection:

```bash
# Check configuration
mailgoat config check

# Expected output:
# ✓ Configuration valid
# ✓ Connected to Postal server
# ✓ API credentials valid
# ✓ Mail server: example.com
```

---

## Testing Your Setup

Let's send and receive email through MailGoat!

### Test 1: Send Email

```bash
# Send a test email
mailgoat send \
  --to your-personal-email@gmail.com \
  --subject "Hello from MailGoat" \
  --body "This is a test email sent via MailGoat CLI"

# Expected output:
# ✓ Message sent successfully
# Message ID: msg_abc123xyz
```

Check your personal email inbox. The email should arrive within seconds.

### Test 2: Check Inbox

```bash
# List messages in your inbox
mailgoat inbox

# Expected output:
# ID              FROM                    SUBJECT                 RECEIVED
# msg_def456      friend@example.com      Hey!                   2 minutes ago
# msg_ghi789      newsletter@site.com     Weekly update          1 hour ago
```

### Test 3: Read a Message

```bash
# Read a specific message
mailgoat read msg_def456

# Expected output:
# From: friend@example.com
# To: agent@example.com
# Subject: Hey!
# Date: 2026-02-15 14:30:00 UTC
#
# How are you doing?
```

### Test 4: Send with Attachment (Optional)

```bash
# Send email with attachment
mailgoat send \
  --to recipient@example.com \
  --subject "Report attached" \
  --body "Please find the report attached." \
  --attach ./report.pdf
```

### Test 5: JSON Output (For Agents)

```bash
# Get inbox as JSON for programmatic use
mailgoat inbox --format json

# Output:
# [
#   {
#     "id": "msg_def456",
#     "from": "friend@example.com",
#     "subject": "Hey!",
#     "received": "2026-02-15T14:30:00Z",
#     "unread": true
#   }
# ]
```

---

## Troubleshooting

### Issue: Can't Access Web Interface

**Symptoms:** Browser shows "Connection refused" or "Unable to connect"

**Solutions:**

1. **Check if Postal is running:**
   ```bash
   docker-compose ps
   # All services should be "Up"
   ```

2. **Check logs for errors:**
   ```bash
   docker-compose logs postal
   ```

3. **Verify ports are open:**
   ```bash
   sudo netstat -tlnp | grep -E ':(25|80|443)'
   # Should show docker-proxy listening
   ```

4. **Check firewall:**
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 25/tcp
   ```

### Issue: DNS Records Not Verifying

**Symptoms:** Red X marks in Postal DNS verification

**Solutions:**

1. **Wait longer:** DNS propagation can take up to 48 hours (usually 5-30 minutes)

2. **Check DNS from different location:**
   ```bash
   # Use Google's DNS
   dig @8.8.8.8 MX example.com
   ```

3. **Verify record format:** Common mistakes:
   - MX records: Ensure value ends with a dot (`.`) or is configured per provider
   - TXT records: Entire value should be in quotes
   - CNAME records: Can't coexist with other records on same name

4. **Check CloudFlare proxy:** If using CloudFlare, ensure mail-related records are "DNS only" (gray cloud)

### Issue: Emails Being Rejected or Going to Spam

**Symptoms:** Sent emails bounce, or arrive in spam folder

**Solutions:**

1. **Verify PTR record:**
   ```bash
   # Replace with your IP
   dig -x 203.0.113.10
   
   # Should return: postal.example.com
   ```
   
   If not set, request from your hosting provider.

2. **Check sender reputation:**
   - Use fresh IP (not previously used for spam)
   - Warm up gradually (send small volumes first)
   - Use https://www.senderscore.org to check IP reputation

3. **Verify DMARC alignment:**
   ```bash
   # Check DMARC record
   dig TXT _dmarc.example.com
   ```

4. **Test deliverability:**
   - Send to https://www.mail-tester.com
   - Get a score out of 10 (aim for 8+)
   - Follow recommendations

### Issue: MailGoat CLI Connection Failed

**Symptoms:** `mailgoat config check` fails

**Solutions:**

1. **Verify API key:**
   - Log into Postal web UI
   - Go to Mail Server → Credentials
   - Ensure API key matches `~/.mailgoat/config.yml`

2. **Check server URL:**
   - Should be `https://postal.example.com` (with https://)
   - No trailing slash

3. **Test connection manually:**
   ```bash
   curl -H "X-Server-API-Key: your-api-key" \
        https://postal.example.com/api/v1/messages
   ```

4. **Check network access:**
   ```bash
   ping postal.example.com
   telnet postal.example.com 443
   ```

### Issue: Port 25 Blocked

**Symptoms:** Can't receive inbound email, connections to port 25 fail

**Solutions:**

1. **Check with hosting provider:**
   - AWS: Request port 25 unblock via support ticket
   - DigitalOcean: Email support with use case
   - Linode: Open support ticket
   - Google Cloud: Port 25 is permanently blocked, use alternative

2. **Workaround:** Use alternative SMTP port (587) with relay:
   - Not ideal for receiving mail
   - Consider using a relay service

3. **Test port 25 access:**
   ```bash
   # From outside your server
   telnet your-ip-address 25
   
   # Should see: 220 postal.example.com ESMTP Postal...
   ```

### Issue: Database Connection Errors

**Symptoms:** Postal fails to start, database errors in logs

**Solutions:**

1. **Check MariaDB is running:**
   ```bash
   docker-compose ps mariadb
   # Should show "Up"
   ```

2. **Verify credentials match:**
   - Check `.env` file
   - Ensure `DB_PASSWORD` matches in all places

3. **Check database logs:**
   ```bash
   docker-compose logs mariadb
   ```

4. **Reinitialize database (last resort):**
   ```bash
   docker-compose down -v  # Warning: deletes all data
   docker-compose up -d mariadb
   sleep 30
   docker-compose run --rm postal postal initialize
   ```

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `421 Service not available` | SMTP server not ready | Wait, check logs, restart service |
| `550 5.7.1 Relaying denied` | SPF/authentication issue | Check SPF record, use authenticated send |
| `Connection refused` | Port blocked or service down | Check firewall, ensure service running |
| `TLS handshake failed` | Certificate issue | Check SSL certificate, use HTTP for testing |
| `Database connection failed` | DB not accessible | Check credentials, ensure MariaDB running |

---

## Next Steps

Congratulations! You now have a working email infrastructure for AI agents.

### For Development

- **Test thoroughly:** Send emails to various providers (Gmail, Outlook, Yahoo)
- **Monitor logs:** `docker-compose logs -f postal`
- **Check deliverability:** Use https://www.mail-tester.com regularly
- **Join community:** https://discord.postalserver.io for help

### For Production (Phase 2)

These topics are out of scope for the MVP, but important for production:

1. **Security Hardening**
   - Enable HTTPS with Let's Encrypt
   - Set up fail2ban for brute force protection
   - Configure firewall rules (iptables/ufw)
   - Regular security updates

2. **Backup Strategy**
   - Automate database backups
   - Back up Docker volumes
   - Store backups off-site

3. **Monitoring**
   - Set up uptime monitoring
   - Configure alerting (email, Slack, PagerDuty)
   - Monitor disk space, CPU, memory
   - Track email queue size

4. **Performance Tuning**
   - Increase worker threads for high volume
   - Configure database connection pooling
   - Set up log rotation
   - Optimize Docker resource limits

5. **Scaling**
   - Separate database to dedicated server
   - Run multiple Postal instances
   - Use load balancer
   - Implement IP rotation for better reputation

6. **Compliance**
   - GDPR data handling
   - CAN-SPAM compliance
   - Unsubscribe management
   - Bounce handling

### Useful Resources

- **Postal Official Docs:** https://docs.postalserver.io
- **Postal GitHub:** https://github.com/postalserver/postal
- **Postal Discord:** https://discord.postalserver.io
- **MailGoat Documentation:** https://docs.mailgoat.dev _(coming soon)_
- **Email Deliverability Guide:** https://www.validity.com/resource-center/email-deliverability/
- **SPF/DKIM/DMARC Checker:** https://dmarcian.com/

### Getting Help

If you run into issues:

1. **Check logs:** `docker-compose logs postal`
2. **Search Postal discussions:** https://github.com/postalserver/postal/discussions
3. **Ask in Discord:** https://discord.postalserver.io
4. **File an issue:** https://github.com/mailgoat/mailgoat/issues _(for MailGoat-specific problems)_

---

## Appendix: Quick Reference

### Common Commands

```bash
# Check Postal status
docker-compose ps

# View logs
docker-compose logs -f postal

# Restart Postal
docker-compose restart postal

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Create backup
docker-compose exec mariadb mysqldump -u postal -p postal > backup.sql

# Update Postal
docker-compose pull
docker-compose up -d
```

### MailGoat CLI Commands

```bash
# Send email
mailgoat send --to user@example.com --subject "Hi" --body "Message"

# List inbox
mailgoat inbox

# List unread only
mailgoat inbox --unread

# Read message
mailgoat read <message-id>

# Send with attachment
mailgoat send --to user@example.com --subject "File" --attach file.pdf

# JSON output
mailgoat inbox --format json
```

### File Locations

```
~/postal/                           # Postal installation directory
├── docker-compose.yml              # Docker configuration
├── .env                            # Environment variables
└── volumes/                        # Docker volumes
    ├── postal-config/              # Configuration files
    │   └── signing.key             # Email signing key
    ├── postal-data/                # Message storage
    ├── mariadb-data/               # Database files
    └── rabbitmq-data/              # Queue data

~/.mailgoat/                        # MailGoat CLI configuration
└── config.yml                      # CLI configuration file
```

---

**Document version:** 1.0  
**Last updated:** 2026-02-15  
**Tested with:** Postal 3.3.2, MailGoat CLI 0.1.0
