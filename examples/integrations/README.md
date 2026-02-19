# Integration Examples

Production-style integration examples for common MailGoat use cases.

## Examples

- `express-api/`: Express endpoint that sends email via MailGoat CLI.
- `nextjs/`: Next.js API route that sends welcome emails.
- `github-actions/`: Workflow template for deployment notifications.
- `docker/`: Minimal container that runs MailGoat admin server.
- `cron/`: Scheduled daily report sender script.
- `lambda/`: AWS Lambda handler that sends transactional email.

## Shared prerequisites

1. Install and configure MailGoat CLI.
2. Set `MAILGOAT_SERVER_URL` and `MAILGOAT_API_KEY`.
3. Test credentials:
   `mailgoat config get server-url && mailgoat config get api-key`

## Quick verify

Use this smoke test before running an integration:

```bash
mailgoat send --to you@example.com --subject "Integration smoke test" --body "MailGoat is configured"
```
