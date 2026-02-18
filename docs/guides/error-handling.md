# Guide: Error Handling

Related docs: [API Reference](../api-reference.md), [Troubleshooting Advanced](../troubleshooting-advanced.md)

## Error Categories

MailGoat errors typically fall into:
- Validation errors (bad email, missing body, invalid tag).
- Configuration errors (missing config, invalid API key format).
- Transport/network errors (DNS, timeout, refused connection).
- Postal API errors (auth, rate limit, payload validation).
- Local state errors (SQLite lock/path permissions).

## Retry Behavior

`send` and `read` support retries by default.

Disable retries:

```bash
mailgoat send --to user@example.com --subject "x" --body "x" --no-retry
mailgoat read abc123 --no-retry
```

Use this when debugging root-cause behavior.

## Structured Debugging Flow

1. Reproduce with `--debug`.
2. Re-run with `--json` to inspect machine-readable output.
3. If send fails, isolate attachment/template from payload.
4. Validate system state with `mailgoat health --verbose`.

## Common Defensive Patterns

- Pre-validate recipient input in upstream systems.
- Use `--dry-run` for bulk delete operations.
- Cap batch sizes and add sleep/jitter.
- Prefer idempotent wrappers around send scripts.

## Example Wrapper Script

```bash
#!/usr/bin/env bash
set -euo pipefail

if ! output=$(mailgoat send --to "$1" --subject "$2" --body "$3" --json 2>&1); then
  echo "mailgoat send failed" >&2
  echo "$output" >&2
  exit 1
fi

echo "$output"
```
