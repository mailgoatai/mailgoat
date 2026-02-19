#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mailgoat send \
  --to reports@example.com \
  --subject "Daily report {{date}}" \
  --template "$SCRIPT_DIR/report-template.txt" \
  --data "$SCRIPT_DIR/data.json" \
  --tag daily-report
