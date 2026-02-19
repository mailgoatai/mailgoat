#!/usr/bin/env bash
set -euo pipefail

SERVICE=${1:-unknown}
SEVERITY=${2:-info}
MESSAGE=${3:-"no details"}
TO=${ALERT_EMAIL:-ops@example.com}

mailgoat send \
  --to "$TO" \
  --subject "[${SEVERITY^^}] Alert: ${SERVICE}" \
  --body "Service: $SERVICE\nSeverity: $SEVERITY\nMessage: $MESSAGE\nTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --tag "alert-$SEVERITY"
