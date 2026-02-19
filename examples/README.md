# MailGoat Example Integrations

This directory contains practical examples showing how agents can automate workflows with MailGoat CLI.

## New full examples

### `simple-agent/` (Python)

- Polls inbox cache every 5 minutes (default)
- Reads new messages and sends automated acknowledgments
- Uses `mailgoat inbox list`, `mailgoat read`, and `mailgoat send`
- Files:
  - `agent.py`
  - `README.md`
  - `.env.example`

### `nodejs-agent/` (Node.js)

- Monitors inbox in a polling loop
- Parses incoming message data
- Sends structured auto-responses
- Files:
  - `agent.js`
  - `package.json`
  - `README.md`
  - `.env.example`

### `docker-agent/`

- Containerized polling agent with cron inside container
- Uses mounted MailGoat CLI config from host (`~/.mailgoat`)
- Includes docker compose deployment
- Files:
  - `Dockerfile`
  - `docker-compose.yml`
  - `agent.sh`
  - `entrypoint.sh`
  - `README.md`
  - `.env.example`

### `notification-bot/`

- Forwards important emails to Slack/Discord webhooks
- Includes filtering logic by status and keywords
- Files:
  - `agent.js`
  - `package.json`
  - `README.md`
  - `.env.example`

## Existing lightweight scripts

- `notification-agent.sh`
- `inbox-processor.sh`
- `auto-responder.sh`
- `digest-agent.sh`
- `openclaw-integration.js`
- `delete-example.sh`

## General prerequisites

1. MailGoat CLI installed and configured.
2. Inbox cache available (`mailgoat inbox serve` + Postal webhook setup).
3. Required runtime per example (Python/Node/Docker).

## Quick start

```bash
cd examples/simple-agent
cp .env.example .env
set -a; source .env; set +a
python3 agent.py
```
