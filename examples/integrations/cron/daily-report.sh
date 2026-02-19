#!/usr/bin/env bash
set -euo pipefail

# Add to crontab:
# 0 9 * * * /path/to/daily-report.sh

MAILGOAT_SERVER_URL="${MAILGOAT_SERVER_URL:-https://mail.example.com}"
MAILGOAT_API_KEY="${MAILGOAT_API_KEY:-your-key}"
REPORT_PATH="${REPORT_PATH:-/path/to/report.pdf}"

export MAILGOAT_SERVER_URL
export MAILGOAT_API_KEY

mailgoat send \
  --to team@example.com \
  --subject "Daily Report $(date +%Y-%m-%d)" \
  --body "Daily report attached" \
  --attach "$REPORT_PATH"
