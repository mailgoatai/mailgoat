# Next.js API Route Integration

Send transactional email from `pages/api/send.js`.

## Dependencies

- Node.js 18+
- `mailgoat` CLI in PATH
- `next`, `react`, `react-dom`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Run `npm run dev`

## Request example

```bash
curl -X POST http://localhost:3000/api/send \
  -H 'content-type: application/json' \
  -d '{"email":"new-user@example.com"}'
```

## Gotchas / Troubleshooting

- Route returns 500: run `mailgoat send ... --json` manually to validate credentials.
- Serverless path issues: ensure `mailgoat` is available in runtime environment.
- Build deployment: include MailGoat installation in your deploy image.
