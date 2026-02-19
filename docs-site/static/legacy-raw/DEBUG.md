# Debug Mode Documentation

MailGoat CLI includes comprehensive debug logging to help troubleshoot issues, understand API interactions, and optimize performance.

## Enabling Debug Mode

### Method 1: `--debug` Flag (Recommended)

Add `--debug` to any command:

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```

This enables all debug namespaces (`mailgoat:*`).

### Method 2: `DEBUG` Environment Variable

For more granular control, use the `DEBUG` environment variable:

```bash
# Enable all MailGoat debug logs
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Test" --body "Hello"

# Enable only API logs
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"

# Enable multiple namespaces
DEBUG=mailgoat:api,mailgoat:config mailgoat send --to user@example.com --subject "Test" --body "Hello"

# Enable all debug logs (including other libraries)
DEBUG=* mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

## Debug Namespaces

MailGoat uses namespaced debug logging for different components:

### `mailgoat:main`

Main CLI initialization and lifecycle events:

```
[2026-02-15T19:00:00.000Z] [mailgoat:main] 🐛 Debug mode enabled
[2026-02-15T19:00:00.001Z] [mailgoat:main] Node version: v22.22.0
[2026-02-15T19:00:00.002Z] [mailgoat:main] Platform: Linux x64
[2026-02-15T19:00:00.003Z] [mailgoat:main] CWD: /home/user/project
[2026-02-15T19:00:00.004Z] [mailgoat:main] Command: send --to user@example.com --subject Test --body Hello --debug
```

### `mailgoat:config`

Configuration loading, resolution, and validation:

```
[2026-02-15T19:00:00.010Z] [mailgoat:config] Config path resolved to: /home/user/.mailgoat/config.yml
[2026-02-15T19:00:00.012Z] [mailgoat:config] Loading config from: /home/user/.mailgoat/config.yml
[2026-02-15T19:00:00.015Z] [mailgoat:config] Config file size: 124 bytes
[2026-02-15T19:00:00.016Z] [mailgoat:config] Parsed config - server: postal.example.com, email: agent@example.com
[2026-02-15T19:00:00.017Z] [mailgoat:config] API key length: 32 characters
[2026-02-15T19:00:00.018Z] [mailgoat:config] Config validation passed
```

### `mailgoat:validation`

Input validation results before API calls:

```
[2026-02-15T19:00:00.020Z] [mailgoat:validation] Validating send inputs
[2026-02-15T19:00:00.021Z] [mailgoat:validation] Input params:
{
  "to": ["user@example.com"],
  "subject": "Test",
  "bodyLength": 5,
  "from": "agent@example.com"
}
[2026-02-15T19:00:00.025Z] [mailgoat:validation] All validations passed ✓
```

### `mailgoat:api`

HTTP requests, responses, and retry logic:

```
[2026-02-15T19:00:00.030Z] [mailgoat:api] Initializing PostalClient with server: https://postal.example.com
[2026-02-15T19:00:00.031Z] [mailgoat:api] Retry config: enabled=true, maxRetries=3, baseDelay=1000ms
[2026-02-15T19:00:00.035Z] [mailgoat:api] Attempt 1/3 for: Send message
[2026-02-15T19:00:00.036Z] [mailgoat:api] → POST https://postal.example.com/api/v1/send/message
[2026-02-15T19:00:00.037Z] [mailgoat:api]   Headers:
{
  "X-Server-API-Key": "abcd...xyz",
  "Content-Type": "application/json"
}
[2026-02-15T19:00:00.038Z] [mailgoat:api]   Body:
{
  "to": ["user@example.com"],
  "from": "agent@example.com",
  "subject": "Test",
  "plain_body": "Hello"
}
[2026-02-15T19:00:00.250Z] [mailgoat:api] ← 200 OK
[2026-02-15T19:00:00.251Z] [mailgoat:api]   Response:
{
  "status": "success",
  "data": {
    "message_id": "abc123",
    "messages": {
      "user@example.com": {
        "id": 12345,
        "token": "xyz789"
      }
    }
  }
}
```

**Sensitive data protection:**

- API keys are automatically sanitized (shows first 4 and last 4 characters)
- Passwords, tokens, and secrets are masked as `***`

### `mailgoat:timing`

Performance timing for operations:

```
[2026-02-15T19:00:00.005Z] [mailgoat:timing] ⏱️  Started: Send email operation
[2026-02-15T19:00:00.010Z] [mailgoat:timing] ⏱️  Started: Load configuration
[2026-02-15T19:00:00.018Z] [mailgoat:timing] ✓ Completed: Load configuration (8ms)
[2026-02-15T19:00:00.020Z] [mailgoat:timing] ⏱️  Started: Validate inputs
[2026-02-15T19:00:00.025Z] [mailgoat:timing] ✓ Completed: Validate inputs (5ms)
[2026-02-15T19:00:00.030Z] [mailgoat:timing] ⏱️  Started: Initialize Postal client
[2026-02-15T19:00:00.035Z] [mailgoat:timing] ✓ Completed: Initialize Postal client (5ms)
[2026-02-15T19:00:00.036Z] [mailgoat:timing] ⏱️  Started: Send message via API
[2026-02-15T19:00:00.251Z] [mailgoat:timing] ✓ Completed: Send message via API (215ms)
[2026-02-15T19:00:00.252Z] [mailgoat:timing] ✓ Completed: Send email operation (247ms)
```

## Use Cases

### Troubleshooting Connection Issues

```bash
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Look for:

- Server URL being contacted
- HTTP status codes
- Error responses from Postal

### Debugging Authentication

```bash
DEBUG=mailgoat:api,mailgoat:config mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Check:

- Config file location and contents
- API key (sanitized)
- 401/403 responses

### Performance Analysis

```bash
DEBUG=mailgoat:timing mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Measure:

- Total operation time
- API request/response time
- Config loading time
- Validation time

### Retry Behavior

```bash
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Watch for:

- Retry attempts (`Attempt 1/3 for: Send message`)
- Backoff delays (`Retrying Send message after 1000ms`)
- Final success or failure

### Input Validation

```bash
DEBUG=mailgoat:validation mailgoat send --to invalid-email --subject "Test" --body "Hello"
```

See exactly which validation rule failed and why.

## Common Debugging Scenarios

### Scenario 1: Email Not Sending

```bash
# Full debug to see the entire flow
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```

Look for:

1. Config loaded successfully?
2. Validation passed?
3. API request sent?
4. Response status (200 OK)?
5. Any error messages?

### Scenario 2: Slow Performance

```bash
# Check timing of each operation
DEBUG=mailgoat:timing mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Identify bottlenecks:

- Config loading > 100ms? (Disk I/O issue)
- API request > 2s? (Network issue)
- Validation > 50ms? (Unexpected)

### Scenario 3: Intermittent Failures

```bash
# Watch retry behavior
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Check:

- Are retries happening?
- What errors trigger retries?
- Do retries eventually succeed?

### Scenario 4: Configuration Issues

```bash
# See config resolution
DEBUG=mailgoat:config mailgoat config show
```

Verify:

- Config file location correct?
- Config file readable?
- All required fields present?

## Output Redirection

Debug logs are sent to **stderr**, so you can redirect them separately:

```bash
# Send debug logs to file, normal output to terminal
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Test" --body "Hello" 2> debug.log

# Send both to terminal
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Test" --body "Hello" 2>&1 | tee output.log

# Silent debug logs, show only errors
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Test" --body "Hello" 2>/dev/null
```

## Debug Mode in Scripts

### Bash Script

```bash
#!/bin/bash
set -euo pipefail

# Enable debug for troubleshooting
export DEBUG=mailgoat:*

mailgoat send \
  --to "$RECIPIENT" \
  --subject "Automated Report" \
  --body "$(cat report.txt)"
```

### CI/CD Pipeline

```yaml
# GitHub Actions
- name: Send notification
  run: |
    DEBUG=mailgoat:api mailgoat send \
      --to team@example.com \
      --subject "Build ${{ github.run_number }} completed" \
      --body "Success!"
  env:
    DEBUG: mailgoat:api
```

## Performance Impact

Debug mode adds minimal overhead:

- **Config/validation logging:** < 1ms per operation
- **API logging:** < 5ms per request (JSON serialization)
- **Timing:** < 1ms per measurement

**Recommendation:** Safe to use in production for troubleshooting, but disable for high-throughput scenarios (>100 emails/sec).

## Tips

1. **Start broad, narrow down:** Use `mailgoat:*` first, then focus on specific namespaces
2. **Combine with `--json`:** Debug logs on stderr, JSON output on stdout for easy parsing
3. **Save debug logs:** Redirect stderr to file for later analysis
4. **Check timing first:** Often reveals the problem area quickly
5. **Sanitize before sharing:** Debug logs automatically hide sensitive data, but review before sharing publicly

## Disabling Debug Mode

Debug mode is off by default. To ensure it's disabled:

```bash
# Remove DEBUG environment variable
unset DEBUG

# Or run without --debug flag
mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

## Related Commands

- `mailgoat config show --debug` - Debug config loading
- `mailgoat inbox list --debug` - Debug inbox queries
- `mailgoat read <id> --debug` - Debug message retrieval
- `mailgoat config test --debug` - Debug connection testing

## Reporting Issues

When reporting bugs, include debug logs:

```bash
# Capture full debug output
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Test" --body "Hello" 2> debug.log

# Share debug.log (review for sensitive data first!)
```

---

**Note:** Debug logs are designed to be human-readable and grep-friendly. Use standard Unix tools to analyze:

```bash
# Find all API errors
grep "Error" debug.log

# Check timing for slow operations
grep "Completed" debug.log | grep -E "[0-9]{3,}ms|[0-9]+\.[0-9]+s"

# See all retry attempts
grep "Retrying" debug.log
```
