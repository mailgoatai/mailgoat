# Notification Bot

Forwards important emails from MailGoat inbox cache to Slack and/or Discord webhooks.

## Filtering logic

A message is considered important if:

- Status is `failed` or `bounced`, or
- Subject/body contains any keyword from `IMPORTANT_KEYWORDS`.

## Setup

```bash
cp .env.example .env
set -a; source .env; set +a
node agent.js
```

## Webhook integration

- Slack incoming webhook URL: `SLACK_WEBHOOK_URL`
- Discord webhook URL: `DISCORD_WEBHOOK_URL`

You can set either one or both.
