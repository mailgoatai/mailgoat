# Docker Deployment Guide

Complete guide for building, testing, and deploying MailGoat via Docker.

## Table of Contents

1. [Quick Start (CLI Only)](#quick-start-cli-only)
2. [Full Stack Deployment (MailGoat + Postal)](#full-stack-deployment-mailgoat--postal) ⭐ **RECOMMENDED**
3. [Building Locally](#building-locally)
4. [Running Commands](#running-commands)
5. [Docker Compose](#docker-compose)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start (CLI Only)

If you already have a Postal server running or want to use the hosted MailGoat service:

```bash
# Pull and run
docker pull mailgoatai/mailgoat:latest
docker run --rm mailgoatai/mailgoat:latest --help
```

---

## Full Stack Deployment (MailGoat + Postal)

⭐ **This is the recommended way to self-host MailGoat.** Deploy a complete email system in one command!

### What You Get

- ✅ Full Postal mail server (web UI, SMTP, worker)
- ✅ MariaDB database
- ✅ Redis for caching
- ✅ RabbitMQ for message queue
- ✅ MailGoat CLI ready to use
- ✅ All services configured and health-checked
- ✅ Persistent storage with Docker volumes
- ✅ Production-ready with proper networking

**Time to deploy:** ~5 minutes  
**Prerequisites:** Docker, Docker Compose, a domain name

### Quick Deploy

```bash
# 1. Clone the repository
git clone https://github.com/mailgoatai/mailgoat.git
cd mailgoat

# 2. Run the quickstart script
bash scripts/quickstart.sh
```

The script will:

1. Check prerequisites (Docker, Docker Compose)
2. Generate secure passwords automatically
3. Create `.env` file from template
4. Prompt you to configure your domain
5. Pull all required Docker images
6. Start all services with health checks
7. Initialize the Postal database
8. Show you the next steps

### Manual Setup

If you prefer to set up manually:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secure passwords
openssl rand -base64 32  # For DB_PASSWORD
openssl rand -base64 32  # For RABBITMQ_PASSWORD
openssl rand -hex 64     # For SECRET_KEY_BASE
openssl rand -hex 64     # For SIGNING_KEY

# 3. Edit .env with your configuration
nano .env

# Required settings:
#   - POSTAL_HOSTNAME (e.g., postal.yourdomain.com)
#   - SMTP_HOSTNAME (e.g., mail.yourdomain.com)
#   - All passwords you generated above

# 4. Start services
docker-compose -f docker-compose.full.yml up -d

# 5. Wait for services to be healthy (1-2 minutes)
docker-compose -f docker-compose.full.yml ps

# 6. Initialize Postal database
docker-compose -f docker-compose.full.yml exec postal-web postal initialize

# 7. Create admin user
docker-compose -f docker-compose.full.yml exec postal-web postal make-user
```

### DNS Configuration

Before your mail server can work, configure these DNS records:

```
# A Records (point to your server IP)
postal.yourdomain.com.    A    192.0.2.1
mail.yourdomain.com.      A    192.0.2.1

# MX Record (for receiving email)
yourdomain.com.           MX   10 mail.yourdomain.com.

# SPF Record (sender policy framework)
yourdomain.com.           TXT  "v=spf1 mx ~all"

# DKIM and DMARC (configure after Postal setup)
# Postal will generate these in the web UI
```

### Initial Setup Steps

1. **Access Postal Web UI:**

   ```
   http://postal.yourdomain.com:5000
   ```

   (Use HTTPS in production with SSL certificate)

2. **Create Admin Account:**

   ```bash
   docker-compose -f docker-compose.full.yml exec postal-web postal make-user
   ```

   Follow the prompts to create your admin account.

3. **Create Organization:**
   - Log into Postal web UI
   - Create a new organization
   - Add your domain(s)
   - Generate API credentials

4. **Configure DKIM/DMARC:**
   - In Postal UI: Organization → Domains → Your Domain → DKIM
   - Copy the DNS records
   - Add them to your DNS provider
   - Wait for DNS propagation (can take up to 24 hours)

5. **Add API Key to MailGoat:**

   ```bash
   # Edit .env file
   nano .env

   # Set MAILGOAT_API_KEY to the key from Postal
   MAILGOAT_API_KEY=your_api_key_here
   ```

6. **Test Sending Email:**
   ```bash
   docker-compose -f docker-compose.full.yml run --rm mailgoat \
     mailgoat send \
       --to test@example.com \
       --subject "Test Email" \
       --body "Hello from your self-hosted MailGoat!"
   ```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   MariaDB    │  │    Redis     │  │  RabbitMQ   │  │
│  │  (Database)  │  │  (Caching)   │  │   (Queue)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┴──────┐  │
│  │              Postal Services                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │  │
│  │  │   Web    │  │   SMTP   │  │   Worker     │   │  │
│  │  │  Server  │  │  Server  │  │   (x2)       │   │  │
│  │  └─────┬────┘  └─────┬────┘  └──────────────┘   │  │
│  └────────┼─────────────┼───────────────────────────┘  │
│           │             │                               │
│  ┌────────┴─────────────┴───────────────┐              │
│  │         MailGoat CLI                 │              │
│  │  (Interactive or Scripted Usage)     │              │
│  └──────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Service Details

| Service         | Purpose              | Port            | Health Check         |
| --------------- | -------------------- | --------------- | -------------------- |
| `mariadb`       | Database for Postal  | 3306 (internal) | MySQL ping           |
| `redis`         | Caching and sessions | 6379 (internal) | Redis ping           |
| `rabbitmq`      | Message queue        | 5672, 15672     | Rabbit diagnostics   |
| `postal-web`    | Web UI and API       | 5000            | HTTP health endpoint |
| `postal-smtp`   | SMTP server          | 25, 587         | TCP port check       |
| `postal-worker` | Background jobs      | N/A             | Process check        |
| `mailgoat`      | CLI interface        | N/A             | Manual usage         |

### Useful Commands

```bash
# View all services status
docker-compose -f docker-compose.full.yml ps

# View logs
docker-compose -f docker-compose.full.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.full.yml logs -f postal-web

# Restart a service
docker-compose -f docker-compose.full.yml restart postal-web

# Stop all services
docker-compose -f docker-compose.full.yml down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.full.yml down -v

# Access Postal CLI
docker-compose -f docker-compose.full.yml exec postal-web postal --help

# Access MailGoat CLI interactively
docker-compose -f docker-compose.full.yml run --rm mailgoat

# Run MailGoat command
docker-compose -f docker-compose.full.yml run --rm mailgoat \
  mailgoat send --to user@example.com --subject "Hi" --body "Hello!"

# Check service health
docker-compose -f docker-compose.full.yml exec postal-web curl -f http://localhost:5000/health

# Database backup
docker-compose -f docker-compose.full.yml exec mariadb \
  mysqldump -u postal -p postal > backup-$(date +%Y%m%d).sql

# Database restore
docker-compose -f docker-compose.full.yml exec -T mariadb \
  mysql -u postal -p postal < backup-20260218.sql
```

### Production Considerations

#### 1. **SSL/TLS Certificates**

Use Let's Encrypt for free SSL:

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d postal.yourdomain.com -d mail.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/postal.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/postal.yourdomain.com/privkey.pem

# Update .env with certificate paths
```

#### 2. **Reverse Proxy (Nginx)**

Uncomment the nginx service in `docker-compose.full.yml` for production:

- Automatic HTTPS redirect
- SSL termination
- Better performance
- Security headers

#### 3. **Firewall Configuration**

```bash
# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 587/tcp   # SMTP submission

# Block database ports from external access
# (they're only exposed on 127.0.0.1)

# Enable firewall
sudo ufw enable
```

#### 4. **Monitoring**

Access RabbitMQ management UI:

```
http://your-server:15672
Username: postal
Password: (from .env RABBITMQ_PASSWORD)
```

Monitor Postal health:

```bash
curl http://postal.yourdomain.com:5000/health
```

#### 5. **Backups**

Uncomment the `db-backup` service in `docker-compose.full.yml` for automatic daily backups.

Manual backup:

```bash
# Backup volumes
docker run --rm \
  -v mailgoat_mariadb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mariadb-$(date +%Y%m%d).tar.gz /data

# Backup .env (contains secrets!)
cp .env backups/.env-$(date +%Y%m%d)
chmod 600 backups/.env-*
```

#### 6. **Scaling**

Increase worker replicas for high volume:

```yaml
# In docker-compose.full.yml
postal-worker:
  deploy:
    replicas: 4 # Increase from 2 to 4
```

Or via environment:

```bash
# In .env
WORKER_REPLICAS=4
```

#### 7. **Resource Limits**

The default configuration includes resource limits:

- Workers: 512MB RAM max, 256MB reserved
- CPU: 1.0 max per worker

Adjust in `docker-compose.full.yml` based on your server capacity.

### Troubleshooting

**Services won't start:**

```bash
# Check logs
docker-compose -f docker-compose.full.yml logs

# Check individual service
docker-compose -f docker-compose.full.yml logs postal-web

# Verify .env configuration
cat .env | grep -v "^#" | grep -v "^$"
```

**Can't send email:**

1. Check if port 25 is blocked by your ISP/provider
2. Verify DNS records are configured correctly
3. Check DKIM signatures are set up
4. Review Postal logs: `docker-compose -f docker-compose.full.yml logs postal-smtp`

**Database connection errors:**

```bash
# Check if MariaDB is healthy
docker-compose -f docker-compose.full.yml ps mariadb

# Test database connection
docker-compose -f docker-compose.full.yml exec mariadb \
  mysql -u postal -p -e "SELECT 1;"
```

**Out of disk space:**

```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers
docker system prune -a

# Check volume sizes
docker system df -v | grep mailgoat
```

**Reset everything (⚠️ DESTRUCTIVE):**

```bash
# Stop and remove all containers and volumes
docker-compose -f docker-compose.full.yml down -v

# Remove all data
docker volume rm $(docker volume ls -q | grep mailgoat)

# Start fresh
docker-compose -f docker-compose.full.yml up -d
```

### Security Best Practices

1. **Change all default passwords** in `.env`
2. **Use strong passwords** (32+ characters, generated with `openssl rand -base64 32`)
3. **Enable firewall** to block unnecessary ports
4. **Use HTTPS** for Postal web UI (configure SSL certificates)
5. **Keep .env file secure** (`chmod 600 .env`)
6. **Regular backups** of database and configuration
7. **Update Docker images** regularly for security patches
8. **Monitor logs** for suspicious activity
9. **Set up fail2ban** to prevent brute force attacks
10. **Use DKIM, SPF, and DMARC** to prevent email spoofing

---

## Building Locally

```bash
# Clone repository
git clone https://github.com/mailgoatai/mailgoat.git
cd mailgoat

# Build image
docker build -t mailgoatai/mailgoat:local .

# Verify build
docker images mailgoatai/mailgoat:local
```

**Expected image size:** <50MB

## Running Commands

### Basic Usage

```bash
# Show help
docker run --rm mailgoatai/mailgoat:latest --help

# Show version
docker run --rm mailgoatai/mailgoat:latest --version
```

### Sending Email

```bash
# Using environment variables
docker run --rm \
  -e MAILGOAT_SERVER=https://api.mailgoat.ai \
  -e MAILGOAT_API_KEY=your_api_key \
  -e MAILGOAT_EMAIL=agent@yourdomain.com \
  mailgoatai/mailgoat:latest \
  send \
    --to user@example.com \
    --subject "Test Email" \
    --body "Hello from Docker!"
```

### Interactive Mode

```bash
# Run shell inside container
docker run -it --rm \
  -e MAILGOAT_API_KEY=your_key \
  mailgoatai/mailgoat:latest \
  sh

# Then run commands interactively
mailgoat --help
mailgoat send --to test@example.com --subject "Interactive" --body "Test"
```

## Docker Compose

### Basic Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mailgoat:
    image: mailgoatai/mailgoat:latest
    environment:
      MAILGOAT_SERVER: https://api.mailgoat.ai
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: ${MAILGOAT_EMAIL}
    command:
      - send
      - --to
      - user@example.com
      - --subject
      - 'Hello from Docker Compose'
      - --body
      - 'This works!'
```

Create `.env` file:

```bash
MAILGOAT_API_KEY=your_api_key_here
MAILGOAT_EMAIL=agent@yourdomain.com
```

Run:

```bash
docker-compose up
```

### Advanced: Multiple Services

```yaml
version: '3.8'

services:
  # Scheduled sender
  mailgoat-scheduler:
    image: mailgoatai/mailgoat:latest
    environment:
      MAILGOAT_SERVER: ${MAILGOAT_SERVER}
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: scheduler@yourdomain.com
    command:
      - send
      - --to
      - reports@yourdomain.com
      - --subject
      - 'Daily Report'
      - --body
      - 'Automated daily report'
    restart: on-failure

  # Inbox checker
  mailgoat-inbox:
    image: mailgoatai/mailgoat:latest
    environment:
      MAILGOAT_SERVER: ${MAILGOAT_SERVER}
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
    command:
      - inbox
      - --since
      - 1h
    restart: on-failure
```

## Kubernetes Deployment

### CronJob Example

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mailgoat-daily-report
spec:
  schedule: '0 9 * * *' # Every day at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: mailgoat
              image: mailgoatai/mailgoat:latest
              env:
                - name: MAILGOAT_SERVER
                  value: 'https://api.mailgoat.ai'
                - name: MAILGOAT_API_KEY
                  valueFrom:
                    secretKeyRef:
                      name: mailgoat-secrets
                      key: api-key
                - name: MAILGOAT_EMAIL
                  value: 'agent@yourdomain.com'
              command:
                - mailgoat
                - send
                - --to
                - reports@yourdomain.com
                - --subject
                - Daily Report
                - --body
                - Your daily report is ready
          restartPolicy: OnFailure
```

Create secret:

```bash
kubectl create secret generic mailgoat-secrets \
  --from-literal=api-key=your_api_key_here
```

Apply:

```bash
kubectl apply -f cronjob.yml
```

## Environment Variables

| Variable           | Required | Description                                       |
| ------------------ | -------- | ------------------------------------------------- |
| `MAILGOAT_SERVER`  | No       | API server URL (default: https://api.mailgoat.ai) |
| `MAILGOAT_API_KEY` | Yes      | Your API key from Postal/MailGoat                 |
| `MAILGOAT_EMAIL`   | Yes      | Default sender email address                      |

## Testing

### Smoke Tests

```bash
# Test 1: Help command
docker run --rm mailgoatai/mailgoat:latest --help
# Expected: CLI help output

# Test 2: Version
docker run --rm mailgoatai/mailgoat:latest --version
# Expected: Version number

# Test 3: Invalid command
docker run --rm mailgoatai/mailgoat:latest invalid-command 2>&1 | grep -q "unknown command"
# Expected: Error message
```

### Integration Tests

```bash
# Test 4: Send email
docker run --rm \
  -e MAILGOAT_API_KEY=$MAILGOAT_API_KEY \
  -e MAILGOAT_EMAIL=$MAILGOAT_EMAIL \
  mailgoatai/mailgoat:latest \
  send \
    --to test@example.com \
    --subject "Docker Test" \
    --body "Integration test from Docker"
# Expected: Success message

# Test 5: Check inbox
docker run --rm \
  -e MAILGOAT_API_KEY=$MAILGOAT_API_KEY \
  mailgoatai/mailgoat:latest \
  inbox --since 1h
# Expected: Recent messages list
```

## CI/CD Integration

### GitHub Actions

The repository includes `.github/workflows/docker.yml` for automated builds:

- **Triggers:** Git tags matching `v*.*.*`
- **Output:** Multi-arch images (amd64, arm64)
- **Registry:** Docker Hub at `mailgoatai/mailgoat`

To trigger a build:

```bash
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

### GitLab CI

```yaml
docker-build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
  only:
    - tags
```

## Troubleshooting

### Image Size Too Large

If the image exceeds 50MB:

1. Check `.dockerignore` is properly configured
2. Verify multi-stage build is working
3. Review installed dependencies

```bash
# Analyze image layers
docker history mailgoatai/mailgoat:latest

# Find large layers
docker history mailgoatai/mailgoat:latest --format "table {{.Size}}\t{{.CreatedBy}}" | sort -hr
```

### Permission Errors

The container runs as non-root user `mailgoat` (UID 1000):

```bash
# If mounting volumes, ensure correct permissions
chown -R 1000:1000 /path/to/volume
```

### Network Issues

```bash
# Test connectivity from container
docker run --rm mailgoatai/mailgoat:latest sh -c "ping -c 1 api.mailgoat.ai"

# Use host network if needed
docker run --network host mailgoatai/mailgoat:latest ...
```

## Production Recommendations

1. **Use specific tags**, not `latest`:

   ```bash
   docker pull mailgoatai/mailgoat:1.0.0
   ```

2. **Store secrets securely**:
   - Use Docker secrets
   - Use Kubernetes secrets
   - Use environment variable injection

3. **Resource limits**:

   ```bash
   docker run --rm \
     --memory="128m" \
     --cpus="0.5" \
     mailgoatai/mailgoat:latest ...
   ```

4. **Health checks**:

   ```yaml
   healthcheck:
     test: ['CMD', 'mailgoat', '--version']
     interval: 30s
     timeout: 3s
     retries: 3
   ```

5. **Logging**:
   ```bash
   docker run --rm \
     --log-driver=json-file \
     --log-opt max-size=10m \
     --log-opt max-file=3 \
     mailgoatai/mailgoat:latest ...
   ```

## Security

- Container runs as **non-root user** (UID 1000)
- Minimal base image (`node:20-alpine`)
- No unnecessary packages
- Production dependencies only
- Regular security updates via automated builds

## Support

- **Issues:** https://github.com/mailgoatai/mailgoat/issues
- **Docker Hub:** https://hub.docker.com/r/mailgoatai/mailgoat
- **Documentation:** https://mailgoat.ai/docs
- **Discord:** https://discord.gg/mailgoat
