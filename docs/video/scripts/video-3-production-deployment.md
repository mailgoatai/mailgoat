# Video 3 Script: Production Deployment (7:00)

## 00:00-00:15 Hook

"This is a production-focused MailGoat deployment: containerized runtime, relay setup, and monitoring."

## 00:15-00:45 Problem

"Production email fails in subtle ways: retries, provider config drift, and missing visibility. We\'ll set up a stable baseline in one pass."

## 00:45-06:45 Demo

1. Docker runtime

```bash
docker pull mailgoatai/mailgoat:latest
```

2. Compose setup

```yaml
services:
  mailgoat:
    image: mailgoatai/mailgoat:latest
    environment:
      MAILGOAT_SERVER: https://api.mailgoat.ai
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: ${MAILGOAT_EMAIL}
```

3. SendGrid relay config flow (example config + validation)

```bash
mailgoat config set server https://api.mailgoat.ai
mailgoat config validate
mailgoat health
```

4. Deploy and smoke test

```bash
mailgoat send --to ops@example.com --subject "Prod smoke test" --body "MailGoat deploy OK"
```

5. Monitoring and operations

```bash
mailgoat metrics serve --port 9090
mailgoat scheduler start
mailgoat inspect --json
```

6. Recovery and maintenance highlights

- Retry controls (`--retry-max`, `--timeout`)
- Security scan before template rollout
- Queue/campaign report checks

## 06:45-07:00 CTA

"For deeper runbooks, use the docs linked below this video and adopt the same checks in your deployment pipeline."
