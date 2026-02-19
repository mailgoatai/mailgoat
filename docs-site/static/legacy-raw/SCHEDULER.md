# Scheduler Daemon

MailGoat supports delayed delivery using a local SQLite queue.

## Schedule an Email

Use `--schedule` with local system time:

```bash
mailgoat send \
  --to user@example.com \
  --subject "Reminder" \
  --body "Follow-up" \
  --schedule "2026-03-01 09:00"
```

The message is stored in `~/.mailgoat/scheduler.db` until it is due.

## Start Scheduler Worker

Run the scheduler as a long-lived process:

```bash
mailgoat scheduler start
```

Behavior:

- Polls queue every minute
- Sends due emails
- Marks each item as `sent` or `failed`

Run a single pass for automation/scripts:

```bash
mailgoat scheduler start --once --json
```

## List Scheduled Emails

```bash
mailgoat scheduler list
mailgoat scheduler list --json
```

## Cancel a Scheduled Email

```bash
mailgoat scheduler cancel 42
```

Only `pending` items can be cancelled.

## Timezone Handling

- `--schedule` is interpreted in the system local timezone.
- MailGoat stores timestamps in UTC ISO strings and also stores the detected timezone name.
- Use `mailgoat scheduler list` to confirm queued execution time.
