# Docker Integration

Run MailGoat admin server inside a container.

## Dependencies

- Docker
- MailGoat credentials via environment variables

## Build and run

```bash
docker build -t mailgoat-admin .
docker run --rm -p 3001:3001 \
  -e MAILGOAT_SERVER_URL \
  -e MAILGOAT_API_KEY \
  -e MAILGOAT_ADMIN_PASSWORD \
  mailgoat-admin
```

## Gotchas / Troubleshooting

- Auth/login issues: confirm `MAILGOAT_ADMIN_PASSWORD` is set.
- API errors in UI: verify server URL/API key env vars.
- Port conflict: map to another host port (`-p 4001:3001`).
