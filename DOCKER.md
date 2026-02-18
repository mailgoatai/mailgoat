# Docker Deployment Guide

Complete guide for building, testing, and deploying MailGoat via Docker.

## Quick Start

```bash
# Pull and run
docker pull mailgoatai/mailgoat:latest
docker run --rm mailgoatai/mailgoat:latest --help
```

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
      - "Hello from Docker Compose"
      - --body
      - "This works!"
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
      - "Daily Report"
      - --body
      - "Automated daily report"
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
  schedule: "0 9 * * *"  # Every day at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: mailgoat
            image: mailgoatai/mailgoat:latest
            env:
            - name: MAILGOAT_SERVER
              value: "https://api.mailgoat.ai"
            - name: MAILGOAT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: mailgoat-secrets
                  key: api-key
            - name: MAILGOAT_EMAIL
              value: "agent@yourdomain.com"
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

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILGOAT_SERVER` | No | API server URL (default: https://api.mailgoat.ai) |
| `MAILGOAT_API_KEY` | Yes | Your API key from Postal/MailGoat |
| `MAILGOAT_EMAIL` | Yes | Default sender email address |

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
     test: ["CMD", "mailgoat", "--version"]
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
