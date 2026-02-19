# Simple Python Agent

Practical MailGoat agent example using Python.

## What it does

- Polls local MailGoat inbox cache every 5 minutes (default).
- Reads unseen messages using `mailgoat read`.
- Sends auto-responses using `mailgoat send`.
- Stores processed message IDs in a local state file.

## Files

- `agent.py` - polling + auto-response logic
- `.env.example` - runtime configuration
- `requirements.txt` - dependency manifest (standard-library only)

## Setup

```bash
cd examples/simple-python-agent
cp .env.example .env
set -a; source .env; set +a
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python agent.py
```

## Expected prerequisites

- MailGoat CLI installed and configured
- Inbox webhook receiver configured so `mailgoat inbox list` has data

## Notes

- Poll interval is controlled by `POLL_SECONDS`.
- This example is intentionally minimal and safe to modify.
