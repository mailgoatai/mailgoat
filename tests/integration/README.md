# Integration Tests

This suite validates end-to-end MailGoat workflows across CLI, config, Postal API integration, inbox operations, and admin panel flows.

## Coverage

- Send workflow (`send-workflow.test.ts`):
  - Config save/load via CLI
  - Send success (text + JSON modes)
  - Dry-run behavior
  - Invalid API key handling
  - Connection failure handling
  - Inbox list/search via local cache
  - Admin login + protected API checks
  - Admin inbox endpoint DB-failure handling
- Postal client integration (`postal-client.test.ts`)
- Delete workflow integration (`delete.test.ts`)
- Config integration (`config.test.ts`)
- Validator integration (`validators.test.ts`)

## Running

```bash
npm run test:integration
```

## CI Notes

- Tests use mocked Postal API responses via `nock` (no external Postal dependency required).
- Admin integration tests spawn the CLI server process and verify authenticated endpoints.
- PostgreSQL unavailability in admin inbox tests is asserted as graceful API error handling.
