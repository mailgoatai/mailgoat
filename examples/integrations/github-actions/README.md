# GitHub Actions Integration

Use MailGoat in CI/CD to send deployment notifications.

## Dependencies

- GitHub Actions runner
- Node.js + npm (available on `ubuntu-latest`)
- Repository secrets: `POSTAL_URL`, `POSTAL_KEY`

## Setup

1. Copy `notify.yml` to `.github/workflows/notify.yml` in your project.
2. Add repository secrets `POSTAL_URL` and `POSTAL_KEY`.
3. Push to `main` to trigger.

## Gotchas / Troubleshooting

- Secret not found: verify exact secret names.
- Send failure: add `--debug` to the send command for diagnostics.
- Wrong branch trigger: update `on.push.branches`.
