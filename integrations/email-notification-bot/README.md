# MailGoat Notification Bot

Production-ready system monitoring bot that sends email alerts via MailGoat/Postal when resource thresholds are exceeded.

## Features

- 📊 **Real-time Monitoring** - CPU, memory, disk usage, and temperature
- 📧 **Email Alerts** - HTML and plain text notifications via Postal API
- ⚙️ **Configurable Thresholds** - Set custom limits for all metrics
- 🔄 **Alert Cooldown** - Prevents alert spam with configurable cooldown periods
- 🐳 **Docker Ready** - Full Docker and docker-compose support
- 📝 **Structured Logging** - Winston-based logging to console and files
- 🏥 **Health Checks** - Built-in health monitoring
- 🛡️ **Production Ready** - TypeScript, error handling, graceful shutdown

## Architecture

This bot demonstrates a production MailGoat integration:

```
Notification Bot → Postal HTTP API → Email Delivery
```

The bot calls Postal's HTTP API directly (exactly what the MailGoat CLI will do internally), making it a perfect reference implementation.

## Installation

### Prerequisites

- Node.js 18+ or Docker
- Postal server instance
- Postal API key

### Local Development

```bash
# Clone and install
npm install

# Copy configuration
cp .env.example .env

# Edit .env with your Postal credentials
vim .env

# Build TypeScript
npm run build

# Run
npm start

# Or run in development mode (auto-reload)
npm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t mailgoat-notification-bot .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Configuration

All configuration is via environment variables. See `.env.example` for all options.

### Required Variables

```bash
POSTAL_SERVER_URL=https://postal.example.com
POSTAL_API_KEY=your_api_key_here
FROM_EMAIL=monitor@yourdomain.com
ALERT_EMAIL=admin@yourdomain.com
```

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECK_INTERVAL` | 60000 | Check interval in milliseconds |
| `ALERT_COOLDOWN_MS` | 300000 | Cooldown between alerts (ms) |
| `THRESHOLD_CPU` | 80 | CPU usage threshold (%) |
| `THRESHOLD_MEMORY` | 85 | Memory usage threshold (%) |
| `THRESHOLD_DISK` | 90 | Disk usage threshold (%) |
| `THRESHOLD_TEMP` | - | CPU temperature threshold (°C, optional) |
| `LOG_LEVEL` | info | Logging level (error/warn/info/debug) |
| `HOSTNAME` | - | Override hostname in alerts |

## How It Works

### Monitoring Loop

1. **Collect Metrics** - Uses `systeminformation` library to gather CPU, memory, disk, and temperature data
2. **Check Thresholds** - Compares current values against configured thresholds
3. **Generate Alerts** - If thresholds exceeded, generates HTML email with details
4. **Send Email** - Calls Postal API to send alert
5. **Cooldown** - Prevents duplicate alerts using cooldown timers
6. **Repeat** - Runs continuously at configured interval

### Alert Email Format

Alerts include:

- **Subject Line** - `[WARNING/CRITICAL] System Alert: hostname - cpu, memory`
- **HTML Email** - Formatted with severity colors, metric details
- **Plain Text** - Fallback for email clients without HTML support
- **Metrics Snapshot** - Current values for all monitored resources
- **Timestamp** - When the alert was triggered

### Postal API Integration

The bot uses Postal's HTTP API directly:

```typescript
// Send email
POST https://postal.example.com/api/v1/send/message
Headers:
  X-Server-API-Key: your_api_key
Body:
  {
    "to": ["admin@example.com"],
    "from": "monitor@example.com",
    "subject": "Alert",
    "plain_body": "...",
    "html_body": "..."
  }
```

This is exactly what the MailGoat CLI will wrap, making this code easily portable when the CLI is available.

## Example Alert Email

```
Subject: [WARNING] System Alert: prod-server-01 - memory, disk

🚨 WARNING Alert: prod-server-01

Alerts Triggered:
- MEMORY: Memory usage at 87% (threshold: 85%)
- DISK: Disk usage at 92% (threshold: 90%)

Current System Metrics:
CPU:
  Usage: 45%
  Load Average: 2.1, 1.9, 1.7

Memory:
  Used: 6.95 GB / 8.00 GB (87%)
  Free: 1.05 GB

Disk:
  Used: 92.15 GB / 100.00 GB (92%)
  Free: 7.85 GB

Timestamp: 2026-02-15T16:30:00.000Z
Server: prod-server-01
```

## Logs

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- Console output (colorized)

Log format:
```json
{
  "timestamp": "2026-02-15T16:30:00.000Z",
  "level": "info",
  "message": "Collecting system metrics...",
  "service": "mailgoat-notification-bot"
}
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint
npm run lint
```

### Manual Testing

To test without waiting for threshold violations:

1. **Lower thresholds temporarily:**
   ```bash
   THRESHOLD_CPU=1 THRESHOLD_MEMORY=1 npm run dev
   ```

2. **Check Postal API directly:**
   ```bash
   curl -X POST https://postal.example.com/api/v1/send/message \
     -H "X-Server-API-Key: your_key" \
     -H "Content-Type: application/json" \
     -d '{"to":["test@example.com"],"from":"bot@example.com","subject":"Test","plain_body":"Test"}'
   ```

## Deployment

### Docker Production Deployment

```bash
# Build for production
docker build -t mailgoat-notification-bot:1.0.0 .

# Tag for registry
docker tag mailgoat-notification-bot:1.0.0 registry.example.com/mailgoat-notification-bot:1.0.0

# Push to registry
docker push registry.example.com/mailgoat-notification-bot:1.0.0

# Deploy
docker run -d \
  --name mailgoat-notification-bot \
  --restart unless-stopped \
  --env-file .env \
  registry.example.com/mailgoat-notification-bot:1.0.0
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mailgoat-notification-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mailgoat-notification-bot
  template:
    metadata:
      labels:
        app: mailgoat-notification-bot
    spec:
      containers:
      - name: bot
        image: registry.example.com/mailgoat-notification-bot:1.0.0
        env:
        - name: POSTAL_SERVER_URL
          value: "https://postal.example.com"
        - name: POSTAL_API_KEY
          valueFrom:
            secretKeyRef:
              name: mailgoat-secrets
              key: postal-api-key
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
          requests:
            memory: "128Mi"
            cpu: "100m"
```

## Troubleshooting

### No alerts being sent

1. **Check Postal connection:**
   ```bash
   curl -H "X-Server-API-Key: YOUR_KEY" https://postal.example.com/api/v1/
   ```

2. **Check thresholds:** Ensure current usage exceeds thresholds

3. **Check logs:**
   ```bash
   tail -f logs/combined.log
   ```

4. **Verify cooldown:** Alerts may be in cooldown period

### Postal API errors

- **401 Unauthorized:** Check `POSTAL_API_KEY`
- **Connection refused:** Check `POSTAL_SERVER_URL`
- **Timeout:** Check network connectivity and Postal server status

### High resource usage

- Increase `CHECK_INTERVAL` to reduce monitoring frequency
- Adjust Docker resource limits in `docker-compose.yml`

## Migration to MailGoat CLI

When the MailGoat CLI is available, replacing the `PostalClient` is simple:

**Before (Postal direct):**
```typescript
const response = await postalClient.sendEmail({...});
```

**After (MailGoat CLI):**
```typescript
exec('mailgoat send --to admin@example.com --subject "Alert" --body "..."');
```

Or use the MailGoat Node.js SDK:
```typescript
const mailgoat = new MailGoatClient();
await mailgoat.send({...});
```

## License

MIT

## Support

- Issues: https://github.com/mailgoat/mailgoat/issues
- Documentation: https://docs.mailgoat.dev
- Community: https://discord.gg/mailgoat
