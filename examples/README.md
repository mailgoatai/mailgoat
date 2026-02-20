# MailGoat Example Integrations

This directory contains practical examples showing how agents can automate workflows with MailGoat CLI.

## New full examples

### `mailgoat-examples/` (multi-project repository)

Complete app-style examples with setup docs, tests, templates, `.env.example`, and Docker Compose:

- `todo-app/` (React + Express): signup, task notifications, digest, password reset
- `ecommerce/` (Next.js-style): order confirmation, shipping updates, receipts
- `saas-trial/` (Express + worker): trial start, expiring reminder, expired follow-up
- `blog-comments/` (blog app): new comment, reply, moderation approval
- `ci-reporter/` (GitHub Actions): workflow status emails

### `simple-python-agent/` (Python)

- Polls inbox cache every 5 minutes (default)
- Reads new messages and sends automated acknowledgments
- Uses `mailgoat inbox list`, `mailgoat read`, and `mailgoat send`
- Files:
  - `agent.py`
  - `README.md`
  - `.env.example`

### `fastapi-integration/` (Python + FastAPI)

- Production-style FastAPI integration with async MailGoat client
- Covers registration, password reset, transactional emails, and webhook receiver
- Includes HTML templates and pytest suite
- Files:
  - `main.py`
  - `mailgoat_client.py`
  - `models.py`
  - `templates/`
  - `tests/test_email_flows.py`
  - `README.md`
  - `requirements.txt`

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

## Integration cookbook

`integrations/` contains practical app-integration blueprints:

- `integrations/express-api/`
- `integrations/nextjs/`
- `integrations/github-actions/`
- `integrations/docker/`
- `integrations/cron/`
- `integrations/lambda/`

Start with `integrations/README.md` for prerequisites and smoke tests.

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
