#!/bin/sh
set -eu

STATE_FILE="${STATE_FILE:-/data/docker-agent-state.txt}"
TO_FALLBACK="${TO_FALLBACK:-}"

mkdir -p "$(dirname "$STATE_FILE")"
[ -f "$STATE_FILE" ] || touch "$STATE_FILE"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] docker-agent tick"

mailgoat inbox list --limit 20 --json | jq -c '.[]?' | while read -r row; do
  id=$(echo "$row" | jq -r '.id // empty')
  [ -n "$id" ] || continue

  if grep -qx "$id" "$STATE_FILE"; then
    continue
  fi

  msg=$(mailgoat read "$id" --json)
  from=$(echo "$msg" | jq -r '.from // empty')
  subject=$(echo "$msg" | jq -r '.subject // "(no subject)"')

  target="$from"
  [ -n "$target" ] || target="$TO_FALLBACK"
  [ -n "$target" ] || { echo "$id" >> "$STATE_FILE"; continue; }

  mailgoat send \
    --to "$target" \
    --subject "[Docker Agent] Re: $subject" \
    --body "Automated acknowledgment from dockerized MailGoat agent for message $id." \
    --json >/dev/null

  echo "$id" >> "$STATE_FILE"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] replied for $id"
done
