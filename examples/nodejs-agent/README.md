# Node.js Agent

Node.js example that monitors the local MailGoat inbox cache and sends automated responses.

## Flow

1. Poll inbox via `mailgoat inbox list --json`.
2. Read each unseen message via `mailgoat read <id> --json`.
3. Parse sender/subject/body summary.
4. Send automated response with `mailgoat send`.

## Setup

```bash
cp .env.example .env
set -a; source .env; set +a
npm install
npm start
```

## Requirements

- Node.js 18+
- MailGoat CLI installed + configured
- Inbox cache enabled using `mailgoat inbox serve`
