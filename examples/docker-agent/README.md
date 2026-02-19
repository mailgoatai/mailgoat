# Docker Agent

Containerized MailGoat agent that runs on cron inside the container.

## What it does

- Runs `agent.sh` every 5 minutes (configurable).
- Checks `mailgoat inbox list`.
- Reads new messages and sends auto-acknowledgments.
- Persists processed IDs in `/data/docker-agent-state.txt`.

## Setup

```bash
cp .env.example .env
docker compose up --build -d
docker compose logs -f
```

## Notes

- Mounts `${HOME}/.mailgoat` so the container uses your existing MailGoat CLI config.
- Override schedule with `CRON_SCHEDULE` in `.env`.
