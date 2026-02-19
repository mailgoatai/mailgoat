# Cron Integration

Send a scheduled daily report email using cron.

## Dependencies

- `mailgoat` CLI in PATH
- Linux/macOS cron
- Report file available at `REPORT_PATH`

## Setup

1. Copy `.env.example` and set real values.
2. Export vars before cron entry, or inline them in crontab.
3. Install schedule:
   `0 9 * * * /path/to/daily-report.sh >> /tmp/mailgoat-cron.log 2>&1`

## Gotchas / Troubleshooting

- Cron uses limited PATH: use full path to `mailgoat` if needed.
- Attachment missing: verify `REPORT_PATH` exists at run time.
- Silent failures: always redirect cron logs.
