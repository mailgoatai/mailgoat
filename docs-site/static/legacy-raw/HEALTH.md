## Health Check Command Documentation

The `mailgoat health` command performs system health checks to verify that MailGoat is properly configured and can communicate with the Postal server. This is essential for operational monitoring, CI/CD pipelines, and production deployments.

## Quick Start

```bash
# Basic health check
mailgoat health

# Verbose output
mailgoat health --verbose

# JSON output for monitoring
mailgoat health --json
```

## Exit Codes

The health command uses standard exit codes for automation:

- **Exit 0**: Healthy (no failures, no warnings)
- **Exit 1**: Warnings present (no failures)
- **Exit 2**: Critical failure (one or more failed checks)

### Optional Test Email

You can verify end-to-end send capability by sending a test email to your configured `fromAddress`:

```bash
mailgoat health --send-test
```

This makes it easy to integrate with monitoring tools, scripts, and orchestration systems.

## Health Checks Performed

### 1. Config Validation

**What it checks:**

- Config file exists at `~/.mailgoat/config.yml`
- File is readable and valid YAML
- All required fields present (`server`, `email`, `api_key`)

**Why it matters:**
Without valid config, MailGoat cannot function.

**Failure reasons:**

- Config file not found
- Missing required fields
- Invalid YAML syntax
- Permission issues

**Solution:**

```bash
mailgoat config init
```

### 2. Disk Space

**What it checks:**

- MailGoat directory (`~/.mailgoat`) exists or can be created
- Directory is writable
- Sufficient permissions

**Why it matters:**
MailGoat needs to write config, templates, and logs.

**Failure reasons:**

- Disk full
- Permission denied
- Read-only filesystem

**Solution:**

```bash
# Check disk space
df -h ~

# Check permissions
ls -la ~/.mailgoat

# Fix permissions
chmod 700 ~/.mailgoat
```

### 3. Templates Directory

**What it checks:**

- Templates directory exists or can be created
- Directory is accessible
- Count of templates

**Why it matters:**
Template system requires writable templates directory.

**Status:**

- **Pass**: Directory exists and is accessible
- **Warn**: Directory doesn't exist yet (will be created on demand)
- **Fail**: Permission or I/O error

### 4. Postal Connectivity

**What it checks:**

- Can reach Postal server
- Network connectivity
- DNS resolution
- Port accessibility

**Why it matters:**
Without connectivity, cannot send/receive emails.

**Failure reasons:**

- Server hostname wrong
- Network down
- Firewall blocking
- DNS resolution failed

**Solution:**

```bash
# Test DNS
nslookup postal.example.com

# Test connectivity
curl https://postal.example.com

# Check config
mailgoat config show
```

### 5. API Authentication

**What it checks:**

- API key is valid
- Key has required permissions
- Server accepts credentials

**Why it matters:**
Invalid API key means no email operations possible.

**Failure reasons:**

- API key invalid
- API key expired
- API key lacks permissions
- API key for wrong server

**Solution:**

```bash
# Get new API key from Postal admin panel
# Update config
mailgoat config init
```

## Usage Examples

### Basic Health Check

```bash
$ mailgoat health

Running health checks...

✓ System Healthy

✓ config                 PASS - Config file valid
  Duration: 5ms

✓ disk_space             PASS - Disk space and permissions OK
  Duration: 2ms

⚠ templates              WARN - Templates directory not yet created
  Duration: 1ms

✓ connectivity           PASS - Postal server reachable
  Duration: 145ms

✓ authentication         PASS - API authentication successful
  Duration: 156ms

Summary:
  Total: 5, Passed: 4, Failed: 0, Warnings: 1
  Timestamp: 2026-02-16T00:00:00.000Z
```

**Exit code:** 0 (healthy)

### Verbose Output

```bash
$ mailgoat health --verbose

Checking config...
Checking disk space...
Checking templates...
Checking Postal connectivity...
Checking API authentication...

✓ System Healthy

✓ config                 PASS - Config file valid
  Duration: 5ms
  Details: {
    "path": "/home/user/.mailgoat/config.yml",
    "server": "postal.example.com",
    "email": "agent@example.com"
  }

# ... (full details for each check)
```

### JSON Output

```bash
$ mailgoat health --json

{
  "healthy": true,
  "timestamp": "2026-02-16T00:00:00.000Z",
  "checks": [
    {
      "name": "config",
      "status": "pass",
      "message": "Config file valid",
      "duration": 5,
      "details": {
        "path": "/home/user/.mailgoat/config.yml",
        "server": "postal.example.com",
        "email": "agent@example.com"
      }
    },
    {
      "name": "disk_space",
      "status": "pass",
      "message": "Disk space and permissions OK",
      "duration": 2
    },
    {
      "name": "templates",
      "status": "warn",
      "message": "Templates directory not yet created",
      "duration": 1
    },
    {
      "name": "connectivity",
      "status": "pass",
      "message": "Postal server reachable",
      "duration": 145
    },
    {
      "name": "authentication",
      "status": "pass",
      "message": "API authentication successful",
      "duration": 156
    }
  ],
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 0,
    "warnings": 1
  }
}
```

**Exit code:** 0

### Failed Health Check

```bash
$ mailgoat health

Running health checks...

✗ System Unhealthy

✗ config                 FAIL - Config file not found
  Duration: 2ms
  Solution: Run: mailgoat config init
```

**Exit code:** 1

## Integration Examples

### Monitoring Scripts

#### Bash Script

```bash
#!/bin/bash
# check-mailgoat-health.sh

if mailgoat health --json > /tmp/health.json 2>&1; then
  echo "MailGoat is healthy"
  exit 0
else
  echo "MailGoat is unhealthy!"
  cat /tmp/health.json

  # Send alert
  curl -X POST https://alerts.example.com/webhook \
    -d @/tmp/health.json

  exit 1
fi
```

#### Cron Job

```bash
# Check health every 5 minutes
*/5 * * * * /usr/local/bin/mailgoat health --json >> /var/log/mailgoat-health.log 2>&1 || /usr/local/bin/send-alert.sh
```

### Docker Health Check

```dockerfile
FROM node:18

# Install MailGoat
RUN npm install -g mailgoat

# Configure
COPY .mailgoat /root/.mailgoat

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD mailgoat health || exit 1

CMD ["your-app"]
```

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mailgoat-app
spec:
  containers:
    - name: app
      image: your-app:latest
      livenessProbe:
        exec:
          command:
            - mailgoat
            - health
        initialDelaySeconds: 30
        periodSeconds: 60
        timeoutSeconds: 10
        failureThreshold: 3
      readinessProbe:
        exec:
          command:
            - mailgoat
            - health
        initialDelaySeconds: 10
        periodSeconds: 30
        timeoutSeconds: 10
```

### Systemd Service

```ini
[Unit]
Description=MailGoat Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mailgoat health
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Run health check
systemctl start mailgoat-health

# Check status
systemctl status mailgoat-health

# Schedule with timer
systemctl enable mailgoat-health.timer
```

### CI/CD Pipelines

#### GitHub Actions

```yaml
name: Health Check

on:
  schedule:
    - cron: '0 * * * *' # Every hour
  workflow_dispatch:

jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Install MailGoat
        run: npm install -g mailgoat

      - name: Configure MailGoat
        run: |
          mkdir -p ~/.mailgoat
          echo "${{ secrets.MAILGOAT_CONFIG }}" > ~/.mailgoat/config.yml

      - name: Run Health Check
        run: mailgoat health --json

      - name: Upload Results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: health-report
          path: health.json
```

#### GitLab CI

```yaml
health_check:
  stage: test
  script:
    - npm install -g mailgoat
    - mkdir -p ~/.mailgoat
    - echo "$MAILGOAT_CONFIG" > ~/.mailgoat/config.yml
    - mailgoat health --json | tee health.json
  artifacts:
    when: always
    reports:
      junit: health.json
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

### Monitoring Integration

#### Prometheus

```python
#!/usr/bin/env python3
# mailgoat-exporter.py

import subprocess
import json
from prometheus_client import start_http_server, Gauge
import time

# Metrics
health_status = Gauge('mailgoat_healthy', 'Overall health status')
check_status = Gauge('mailgoat_check_status', 'Individual check status', ['check'])
check_duration = Gauge('mailgoat_check_duration_ms', 'Check duration', ['check'])

def collect_metrics():
    try:
        result = subprocess.run(
            ['mailgoat', 'health', '--json'],
            capture_output=True,
            text=True
        )

        data = json.loads(result.stdout)

        # Overall health
        health_status.set(1 if data['healthy'] else 0)

        # Individual checks
        for check in data['checks']:
            status_value = 1 if check['status'] == 'pass' else 0
            check_status.labels(check=check['name']).set(status_value)

            if 'duration' in check:
                check_duration.labels(check=check['name']).set(check['duration'])

    except Exception as e:
        health_status.set(0)
        print(f"Error: {e}")

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        collect_metrics()
        time.sleep(60)
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "MailGoat Health",
    "panels": [
      {
        "title": "Health Status",
        "targets": [
          {
            "expr": "mailgoat_healthy"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Check Duration",
        "targets": [
          {
            "expr": "mailgoat_check_duration_ms"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Troubleshooting

### All Checks Failing

**Symptom:** Every check shows FAIL

**Likely cause:** Config file issue

**Solution:**

```bash
mailgoat config show
mailgoat config init
```

### Connectivity Failures

**Symptom:** Connectivity check fails, others pass

**Solutions:**

```bash
# Check network
ping postal.example.com

# Check firewall
sudo ufw status

# Test HTTPS
curl -v https://postal.example.com

# Check DNS
nslookup postal.example.com
```

### Authentication Failures

**Symptom:** Connectivity passes, authentication fails

**Solutions:**

```bash
# Verify API key
mailgoat config show

# Get new key from Postal admin
# Update config
mailgoat config init

# Test with debug
mailgoat health --debug
```

### Disk Space Warnings

**Symptom:** Disk space check warns or fails

**Solutions:**

```bash
# Check space
df -h ~

# Clean up
rm -rf ~/.mailgoat/logs/*.old

# Check permissions
chmod 700 ~/.mailgoat
```

## Best Practices

### 1. Regular Monitoring

Run health checks periodically:

```bash
# Cron: Every 15 minutes
*/15 * * * * /usr/local/bin/mailgoat health --json >> /var/log/mailgoat.log
```

### 2. Pre-Deployment Checks

Always check health before deploying:

```bash
# In deployment script
if ! mailgoat health; then
  echo "Health check failed! Aborting deployment"
  exit 1
fi

echo "Health OK, proceeding with deployment"
```

### 3. Alert on Failures

Set up alerting for failed checks:

```bash
#!/bin/bash
if ! mailgoat health --json > /tmp/health.json; then
  # Send to Slack
  curl -X POST $SLACK_WEBHOOK \
    -d "{\"text\": \"MailGoat health check failed\", \"attachments\": [$(cat /tmp/health.json)]}"
fi
```

### 4. Log Results

Always log health check results:

```bash
mailgoat health --json | tee -a /var/log/mailgoat-health.log
```

### 5. Use JSON for Automation

Always use `--json` in scripts:

```bash
# Good
result=$(mailgoat health --json)
healthy=$(echo "$result" | jq -r '.healthy')

# Bad (parsing human-readable output)
mailgoat health | grep "healthy"
```

## Security Considerations

### Sensitive Information

The health check output includes:

- Server hostname
- Email address
- Config file path

**It does NOT include:**

- API keys (redacted in output)
- Email content
- Message IDs

### Safe to Share

Health check output (both human and JSON) is safe to include in:

- Log files
- Monitoring dashboards
- Support tickets
- CI/CD logs

### Not Included

The `--json` output excludes:

- Full API keys (only shown as `***`)
- Authentication tokens
- Private keys

## Related Commands

- [`mailgoat config`](./CONFIG.md) - Manage configuration
- [`mailgoat send`](./SEND.md) - Send test emails
- [`mailgoat --debug`](./DEBUG.md) - Debug mode for diagnostics

## See Also

- [Docker Deployment](./DOCKER.md)
- [Kubernetes Guide](./KUBERNETES.md)
- [Monitoring Setup](./MONITORING.md)
- [CI/CD Integration](./CICD.md)
