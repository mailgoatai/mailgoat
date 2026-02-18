#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash -n "$ROOT/examples/notification-bot/send-alert.sh"
bash -n "$ROOT/examples/report-generator/send-report.sh"
bash -n "$ROOT/examples/batch-sender/batch-send.sh"

node --check "$ROOT/examples/webhook-handler/server.js"
node --check "$ROOT/examples/webhook-handler/poll.js"

grep -q "jobs:" "$ROOT/examples/ci-cd/github-actions.yml"
grep -q "stages:" "$ROOT/examples/ci-cd/gitlab-ci.yml"

echo "All documentation examples validated (syntax/config)."
