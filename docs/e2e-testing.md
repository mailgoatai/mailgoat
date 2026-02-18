# End-to-End Testing Guide

This suite validates real email lifecycle flows against a real Postal test environment.

## Prerequisites

Set these environment variables:

```bash
export MAILGOAT_E2E_ENABLED=true
export MAILGOAT_E2E_SERVER="https://postal-test.example.com"
export MAILGOAT_E2E_API_KEY="your-test-server-api-key"
export MAILGOAT_E2E_SENDER="test-sender@test.mailgoat.ai"
export MAILGOAT_E2E_RECEIVER="test-receiver@test.mailgoat.ai"
```

Optional performance run:

```bash
export MAILGOAT_E2E_PERF=true
```

## Run Locally

```bash
npm run test:e2e -- --runInBand
```

## Test Coverage

`tests/e2e/` includes 15+ scenarios across:

- Send flows: plain, HTML, text/image/PDF attachments
- Receive flow: send -> read, webhook payload ingest -> SQLite cache
- Template rendering and send
- Batch operations (parallel and multi-recipient)
- Error behavior: invalid recipient, auth failure, retry handling
- Performance baseline: optional 100-email parallel send

## Cleanup Strategy

E2E tests register created message IDs and perform best-effort deletion in teardown.
Use isolated test accounts/domains only.

## CI/CD

- PR/Push CI job: `.github/workflows/ci.yml` -> `test-e2e`
- Nightly full run (includes perf): `.github/workflows/e2e-nightly.yml`

Required GitHub secrets:

- `MAILGOAT_E2E_SERVER`
- `MAILGOAT_E2E_API_KEY`
- `MAILGOAT_E2E_SENDER`
- `MAILGOAT_E2E_RECEIVER`
