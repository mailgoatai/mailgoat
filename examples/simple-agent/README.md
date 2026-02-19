# Simple Agent (Python)

A minimal Python agent that polls the local MailGoat inbox cache every 5 minutes and auto-replies to new messages.

## Flow

1. `mailgoat inbox list --json` fetches recent messages.
2. For each unprocessed ID, `mailgoat read <id> --json` gets full content.
3. Agent sends acknowledgment via `mailgoat send`.
4. Processed IDs are persisted in a local state file.

## Prerequisites

- Python 3.9+
- `mailgoat` CLI installed and configured
- Local inbox cache populated (`mailgoat inbox serve` webhook receiver)

## Setup

```bash
cp .env.example .env
set -a; source .env; set +a
python3 agent.py
```

## Notes

- Default poll interval is 300 seconds.
- This script is intentionally simple and stateful.
