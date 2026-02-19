# Express API Integration

Expose a POST endpoint that sends email through MailGoat.

## Dependencies

- Node.js 18+
- `mailgoat` CLI in PATH
- npm package: `express`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set credentials.
3. Export env vars (`set -a; source .env; set +a`).
4. Start API: `npm start`

## Request example

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H 'content-type: application/json' \
  -d '{"to":"dev@example.com","subject":"Hello","message":"Email from Express"}'
```

## Gotchas / Troubleshooting

- `mailgoat: command not found`: install globally (`npm i -g mailgoat`) or add to PATH.
- Auth errors: verify `POSTAL_URL` / `POSTAL_API_KEY` are valid.
- JSON parse failures: run same command manually with `--json` and inspect output.
