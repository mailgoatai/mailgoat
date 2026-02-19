#!/usr/bin/env bash
set -euo pipefail

FILE=${1:-recipients.csv}
if [[ ! -f "$FILE" ]]; then
  echo "missing csv: $FILE" >&2
  exit 1
fi

tail -n +2 "$FILE" | while IFS=, read -r email name; do
  mailgoat send \
    --to "$email" \
    --subject "Campaign update" \
    --body "Hello {{name}}, this is your update." \
    --var name="$name" \
    --tag campaign-2026
  sleep 0.2
done
