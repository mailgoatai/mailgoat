# Self-Hosting Guide

**Estimated time:** 30-45 minutes

Run your own MailGoat instance using Postal. This guide focuses on the happy path—getting a working system up quickly.

## Why Self-Host?

- **Full control** - Your data, your server
- **No rate limits** - Send as much as you need
- **Free forever** - MIT licensed, no fees
- **Privacy** - No third-party access to your emails
- **Customizable** - Modify Postal and MailGoat to your needs

## Prerequisites

Before you begin:

1. **Linux server** (Ubuntu 20.04+ or Debian 11+ recommended)
   - 2+ CPU cores
   - 4+ GB RAM
   - 20+ GB disk space
   - Static IP address

2. **Domain name** you control (e.g., `example.com`)

3. **DNS access** to create records

4. **Docker & Docker Compose** installed
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

5. **Port 25 unblocked** (most VPS providers block this by default - request unblocking)

## Quick Setup

### Step 1: Install Postal

Create a directory and set up Postal:

```bash
mkdir -p ~/postal && cd ~/postal

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mariadb:
    image: mariadb:10.11
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

  rabbitmq:
    image: rabbitmq:3.12-management
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: postal
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - postal

  postal:
    image: ghcr.io/postalserver/postal:3.3.2
    restart: unless-stopped
    depends_on:
      - mariadb
      - rabbitmq
    ports:
      - "25:25"
      - "80:5000"
      - "443:5000"
    environment:
      MAIN_DB_HOST: mariadb
      MAIN_DB_USERNAME: postal
      MAIN_DB_PASSWORD: ${DB_PASSWORD}
      MAIN_DB_DATABASE: postal
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_USERNAME: postal
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      POSTAL_WEB_HOSTNAME: ${POSTAL_HOSTNAME}
      POSTAL_WEB_PROTOCOL: https
      POSTAL_SMTP_HOSTNAME: ${POSTAL_HOSTNAME}
      RAILS_SECRET_KEY: ${RAILS_SECRET_KEY}
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
EOF
```

### Step 2: Configure Environment

```bash
# Create .env file with secure passwords
cat > .env << EOF
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
RAILS_SECRET_KEY=$(openssl rand -hex 64)
POSTAL_HOSTNAME=postal.example.com
EOF
```

**Edit `.env` and replace `postal.example.com` with your actual domain!**

### Step 3: Configure DNS

Create these DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `postal.example.com` | `YOUR_SERVER_IP` | 300 |
| MX | `example.com` | `postal.example.com` | 300 |
| TXT | `example.com` | `v=spf1 a mx ~all` | 300 |

**Test DNS propagation:**
```bash
nslookup postal.example.com
dig MX example.com
```

### Step 4: Start Postal

```bash
# Generate signing key
docker run --rm -v postal-config:/config \
  ghcr.io/postalserver/postal:3.3.2 \
  sh -c "openssl genrsa -out /config/signing.key 2048"

# Initialize database
docker-compose run --rm postal postal initialize

# Create admin user
docker-compose run --rm postal postal make-user

# Start services
docker-compose up -d
```

### Step 5: Access Postal Web UI

Open `https://postal.example.com` in your browser.

**First login:**
1. Use the credentials from the `make-user` command
2. Complete the organization setup
3. Create a mail server
4. Create a domain

### Step 6: Configure MailGoat

Get your API credentials from Postal UI:

1. Navigate to your mail server → **Credentials**
2. Click **Create Credential**
3. Copy the API key

Configure MailGoat:

```bash
mailgoat config init
# Enter:
# - Server: postal.example.com
# - Email: agent@example.com
# - API key: (paste from Postal UI)
```

### Step 7: Send Test Email

```bash
mailgoat send \
  --to your-email@example.com \
  --subject "MailGoat is live!" \
  --body "Self-hosted email is working!"
```

✅ **Done!** You now have a self-hosted MailGoat instance.

## DNS Configuration Details

### Required Records

**A Record (Web UI):**
```
postal.example.com → YOUR_SERVER_IP
```

**MX Record (Receiving Email):**
```
example.com → postal.example.com (priority 10)
```

**SPF Record (Sender Authentication):**
```
TXT: v=spf1 a mx ~all
```

### Optional (Recommended) Records

**DKIM (DomainKeys):**

After creating a domain in Postal UI, it will generate a DKIM record. Add it:

```
TXT: postal._domainkey.example.com → [DKIM key from Postal UI]
```

**DMARC (Policy):**
```
TXT: _dmarc.example.com → v=DMARC1; p=none; rua=mailto:postmaster@example.com
```

**PTR/rDNS (Reverse DNS):**

Configure via your VPS provider to point `YOUR_SERVER_IP` → `postal.example.com`

## Troubleshooting

### Cannot Access Postal Web UI

**Symptoms:** Browser shows "Connection refused" or timeout

**Fixes:**
- Check Postal is running: `docker-compose ps`
- Check firewall: `sudo ufw status` (allow ports 80, 443, 25)
- Verify DNS: `nslookup postal.example.com`
- Check logs: `docker-compose logs postal`

### Email Not Sending

**Symptoms:** MailGoat send fails or emails not received

**Fixes:**
- Verify API key is correct in `~/.mailgoat/config.yml`
- Check Postal logs: `docker-compose logs postal`
- Test DNS: `dig MX example.com`
- Verify SPF record: `dig TXT example.com`
- Check port 25 is open: `telnet postal.example.com 25`

### Email Goes to Spam

**Symptoms:** Emails are delivered but land in spam folder

**Fixes:**
- Add DKIM record (see Postal UI for your specific key)
- Add DMARC record
- Configure rDNS (reverse DNS) via your VPS provider
- Warm up your IP (send to friends/yourself first, gradually increase volume)
- Check reputation: [mail-tester.com](https://www.mail-tester.com)

### Port 25 Blocked

**Symptoms:** Cannot receive email, connections to port 25 fail

**Fixes:**
- **AWS EC2:** Request removal via support ticket
- **DigitalOcean:** Automatic after account review
- **Linode:** Contact support
- **Google Cloud:** Request via support
- Test: `telnet YOUR_SERVER_IP 25` (from external machine)

### Database Connection Error

**Symptoms:** Postal fails to start, database errors in logs

**Fixes:**
- Check database is running: `docker-compose ps mariadb`
- Verify passwords in `.env` match docker-compose.yml
- Reset database: `docker-compose down -v` (⚠️ deletes all data)
- Check logs: `docker-compose logs mariadb`

### Permission Denied Errors

**Symptoms:** Cannot write to volumes, permission errors

**Fixes:**
- Fix ownership: `sudo chown -R 1000:1000 ./postal-data`
- Check Docker permissions: `sudo usermod -aG docker $USER`
- Restart Docker: `sudo systemctl restart docker`

## Security Best Practices

### 1. Use HTTPS

Set up Let's Encrypt for free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d postal.example.com

# Update docker-compose.yml to mount certificates
```

### 2. Firewall Configuration

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 25/tcp   # SMTP
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Secure Passwords

- Never commit `.env` to git (add to `.gitignore`)
- Use strong passwords (generated with `openssl rand -base64 32`)
- Rotate API keys periodically

### 4. Backups

```bash
# Backup database
docker-compose exec mariadb mysqldump -u postal -p postal > backup.sql

# Backup volumes
docker run --rm -v postal-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postal-data.tar.gz /data
```

### 5. Monitor Logs

```bash
# Real-time logs
docker-compose logs -f postal

# Check for errors
docker-compose logs postal | grep ERROR
```

## Maintenance

### Update Postal

```bash
cd ~/postal
docker-compose pull
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f postal
docker-compose logs -f mariadb
docker-compose logs -f rabbitmq
```

### Restart Services

```bash
docker-compose restart
docker-compose restart postal
```

### Stop Services

```bash
docker-compose stop
docker-compose down  # Stops and removes containers
```

## Performance Tuning

For high-volume sending:

1. **Increase resources:**
   - 4+ CPU cores
   - 8+ GB RAM
   - SSD storage

2. **Optimize MariaDB:**
   ```yaml
   # Add to mariadb service in docker-compose.yml
   command: --max-connections=500 --innodb-buffer-pool-size=2G
   ```

3. **Scale workers:**
   See [Postal documentation](https://docs.postalserver.io/) for worker configuration

4. **Monitor queue:**
   Check RabbitMQ management UI at `http://postal.example.com:15672`

## Next Steps

- **[Configuration](configuration.md)** - Set up multiple profiles
- **[Agent Integration](agent-integration.md)** - Use MailGoat from scripts
- **[Postal Integration](postal-integration.md)** - Deep dive into Postal features
- **[FAQ](faq.md)** - Common questions

## Need Help?

- **Postal Docs:** [docs.postalserver.io](https://docs.postalserver.io/)
- **MailGoat Docs:** [GitHub Wiki](https://github.com/opengoat/mailgoat/wiki)
- **Discord:** [discord.gg/mailgoat](https://discord.gg/mailgoat)
- **Issues:** [GitHub Issues](https://github.com/opengoat/mailgoat/issues)
