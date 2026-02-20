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

Tune retry/timeout behavior per command:

```bash
mailgoat send \
  --to user@example.com \
  --subject "Retry tuned" \
  --body "Body" \
  --retry-max 5 \
  --retry-delay 2000 \
  --retry-max-delay 30000 \
  --retry-backoff 2 \
  --timeout 10000
```

You can also set defaults in `~/.mailgoat/config.json`:

```json
{
  "server": "https://postal.example.com",
  "fromAddress": "agent@example.com",
  "api_key": "your-api-key",
  "retry": {
    "maxRetries": 3,
    "initialDelay": 1000,
    "maxDelay": 30000,
    "backoffMultiplier": 2,
    "jitterRatio": 0.2,
    "circuitBreakerThreshold": 5,
    "circuitBreakerCooldownMs": 30000,
    "timeoutMs": 30000
  }
}
```

## Structured Debugging Flow

1. Reproduce with `--debug`.
1.5. Use `--verbose` for detailed operational logs or `--log-json` in CI pipelines.
2. Re-run with `--json` to inspect machine-readable output.
3. If send fails, isolate attachment/template from payload.
4. Validate system state with `mailgoat health --verbose`.

## Common Defensive Patterns

- Pre-validate recipient input in upstream systems.
- Use `--dry-run` for bulk delete operations.
- Cap batch sizes and add sleep/jitter.
- Prefer idempotent wrappers around send scripts.

## Exit Code Contract

- `0`: Success
- `1`: Usage/validation errors
- `2`: Configuration errors
- `3`: Network/transport errors
- `4`: Postal API/auth/rate-limit/server errors

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
