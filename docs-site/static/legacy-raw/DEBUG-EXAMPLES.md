# Debug Mode Examples

Real-world examples of using MailGoat debug mode for troubleshooting and optimization.

## Quick Start

Enable debug mode with the `--debug` flag:

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```

## Example 1: Troubleshooting Authentication Errors

**Problem:** Getting "Authentication failed" errors when sending emails.

**Solution:** Use debug mode to see config loading and API key:

```bash
$ mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug

[2026-02-15T19:00:00.010Z] [mailgoat:config] Config path resolved to: /home/user/.mailgoat/config.yml
[2026-02-15T19:00:00.012Z] [mailgoat:config] Loading config from: /home/user/.mailgoat/config.yml
[2026-02-15T19:00:00.015Z] [mailgoat:config] Config file size: 124 bytes
[2026-02-15T19:00:00.016Z] [mailgoat:config] Parsed config - server: postal.example.com, email: agent@example.com
[2026-02-15T19:00:00.017Z] [mailgoat:config] API key length: 32 characters  👈 Check this!
[2026-02-15T19:00:00.018Z] [mailgoat:config] Config validation passed
...
[2026-02-15T19:00:00.036Z] [mailgoat:api] → POST https://postal.example.com/api/v1/send/message
[2026-02-15T19:00:00.037Z] [mailgoat:api]   Headers:
{
  "X-Server-API-Key": "abcd...xyz",  👈 Verify this matches Postal
  "Content-Type": "application/json"
}
...
[2026-02-15T19:00:00.250Z] [mailgoat:api] ← 401 Unauthorized  👈 Auth error confirmed
```

**What to check:**

- Is API key length correct? (should be 32+ characters)
- Is the server URL correct?
- Does the API key match what's in Postal admin panel?

## Example 2: Slow Email Sending

**Problem:** Emails taking 5+ seconds to send.

**Solution:** Use timing logs to find bottleneck:

```bash
$ DEBUG=mailgoat:timing mailgoat send --to user@example.com --subject "Test" --body "Hello"

[2026-02-15T19:00:00.005Z] [mailgoat:timing] ⏱️  Started: Send email operation
[2026-02-15T19:00:00.010Z] [mailgoat:timing] ⏱️  Started: Load configuration
[2026-02-15T19:00:00.018Z] [mailgoat:timing] ✓ Completed: Load configuration (8ms)  ✅ Normal
[2026-02-15T19:00:00.020Z] [mailgoat:timing] ⏱️  Started: Validate inputs
[2026-02-15T19:00:00.025Z] [mailgoat:timing] ✓ Completed: Validate inputs (5ms)  ✅ Normal
[2026-02-15T19:00:00.030Z] [mailgoat:timing] ⏱️  Started: Initialize Postal client
[2026-02-15T19:00:00.035Z] [mailgoat:timing] ✓ Completed: Initialize Postal client (5ms)  ✅ Normal
[2026-02-15T19:00:00.036Z] [mailgoat:timing] ⏱️  Started: Send message via API
[2026-02-15T19:00:05.251Z] [mailgoat:timing] ✓ Completed: Send message via API (5.2s)  ❌ SLOW!
[2026-02-15T19:00:05.252Z] [mailgoat:timing] ✓ Completed: Send email operation (5.25s)
```

**Diagnosis:** API request is slow (5.2s). This is a network or Postal server issue, not a MailGoat issue.

## Example 3: Invalid Email Address

**Problem:** Send command failing with unclear error.

**Solution:** Check validation logs:

```bash
$ DEBUG=mailgoat:validation mailgoat send --to "not-an-email" --subject "Test" --body "Hello"

[2026-02-15T19:00:00.020Z] [mailgoat:validation] Validating send inputs
[2026-02-15T19:00:00.021Z] [mailgoat:validation] Input params:
{
  "to": ["not-an-email"],  👈 Invalid format!
  "subject": "Test",
  "bodyLength": 5
}
[2026-02-15T19:00:00.022Z] [mailgoat:validation] Invalid To email: not-an-email
Error: Invalid email address: "not-an-email"
Must be in format: user@example.com
```

**Fix:** Use proper email format: `user@example.com`

## Example 4: Connection Refused

**Problem:** Cannot connect to Postal server.

**Solution:** Check API logs for connection details:

```bash
$ DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"

[2026-02-15T19:00:00.030Z] [mailgoat:api] Initializing PostalClient with server: https://postal.wrong-domain.com  👈 Wrong URL?
[2026-02-15T19:00:00.031Z] [mailgoat:api] Retry config: enabled=true, maxRetries=3, baseDelay=1000ms
[2026-02-15T19:00:00.035Z] [mailgoat:api] Attempt 1/3 for: Send message
[2026-02-15T19:00:00.036Z] [mailgoat:api] → POST https://postal.wrong-domain.com/api/v1/send/message
[2026-02-15T19:00:00.250Z] [mailgoat:api] ✗ Error: getaddrinfo ENOTFOUND postal.wrong-domain.com
...
[2026-02-15T19:00:01.251Z] [mailgoat:api] Retrying Send message after 1000ms (attempt 1/3)
[2026-02-15T19:00:01.260Z] [mailgoat:api] Attempt 2/3 for: Send message
```

**Diagnosis:** DNS lookup failed - server hostname is wrong. Check `~/.mailgoat/config.yml`.

## Example 5: Rate Limiting

**Problem:** Getting 429 errors intermittently.

**Solution:** Watch retry behavior:

```bash
$ DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"

[2026-02-15T19:00:00.036Z] [mailgoat:api] → POST https://postal.example.com/api/v1/send/message
[2026-02-15T19:00:00.250Z] [mailgoat:api] ← 429 Too Many Requests  👈 Rate limited!
[2026-02-15T19:00:00.251Z] [mailgoat:api]   Response:
{
  "status": "error",
  "error": "Rate limit exceeded"
}
[2026-02-15T19:00:00.252Z] [mailgoat:api] Retrying Send message after 1000ms (attempt 1/3)  👈 Auto-retry
[2026-02-15T19:00:01.260Z] [mailgoat:api] Attempt 2/3 for: Send message
[2026-02-15T19:00:01.261Z] [mailgoat:api] → POST https://postal.example.com/api/v1/send/message
[2026-02-15T19:00:01.450Z] [mailgoat:api] ← 200 OK  ✅ Retry succeeded!
```

**Diagnosis:** Rate limiting is happening, but retries are working. Consider adding delays between sends in your scripts.

## Example 6: Large Attachment Performance

**Problem:** Sending email with 5MB attachment is slow.

**Solution:** Check timing breakdown:

```bash
$ DEBUG=mailgoat:timing mailgoat send \
  --to user@example.com \
  --subject "Report" \
  --body "See attachment" \
  --attach report.pdf

[2026-02-15T19:00:00.005Z] [mailgoat:timing] ⏱️  Started: Send email operation
📎 Attaching 1 file(s):
   • report.pdf (4.8 MB, application/pdf)
[2026-02-15T19:00:00.036Z] [mailgoat:timing] ⏱️  Started: Send message via API
[2026-02-15T19:00:03.251Z] [mailgoat:timing] ✓ Completed: Send message via API (3.2s)
[2026-02-15T19:00:03.252Z] [mailgoat:timing] ✓ Completed: Send email operation (3.25s)
```

**Diagnosis:** 3.2s for 4.8MB is normal (~1.5 MB/s upload). If much slower, check your network.

## Example 7: Config File Not Found

**Problem:** CLI says config file not found, but you created it.

**Solution:** Check config resolution:

```bash
$ DEBUG=mailgoat:config mailgoat send --to user@example.com --subject "Test" --body "Hello"

[2026-02-15T19:00:00.010Z] [mailgoat:config] Config path resolved to: /home/user/.mailgoat/config.yml  👈 Check this path
[2026-02-15T19:00:00.012Z] [mailgoat:config] Config file does not exist  👈 File missing!
Error: Config file not found at /home/user/.mailgoat/config.yml.
Run `mailgoat config init` to create one...
```

**Fix:** Either:

1. Create config at the expected path: `~/.mailgoat/config.yml`
2. Run `mailgoat config init` to create it interactively

## Example 8: HTML Email Not Rendering

**Problem:** HTML email looks like plain text in recipient's inbox.

**Solution:** Check request body:

```bash
$ DEBUG=mailgoat:api mailgoat send \
  --to user@example.com \
  --subject "Test" \
  --body "<h1>Hello</h1>" \
  --html

[2026-02-15T19:00:00.036Z] [mailgoat:api] → POST https://postal.example.com/api/v1/send/message
[2026-02-15T19:00:00.038Z] [mailgoat:api]   Body:
{
  "to": ["user@example.com"],
  "from": "agent@example.com",
  "subject": "Test",
  "html_body": "<h1>Hello</h1>",  ✅ Correct! HTML is being sent
  "plain_body": null
}
```

**Diagnosis:** MailGoat is sending HTML correctly. Check recipient's email client settings.

## Example 9: Monitoring Multiple Sends

**Problem:** Batch sending emails, need to monitor progress.

**Solution:** Use timing logs to track each send:

```bash
#!/bin/bash

# Send emails with timing
for email in user1@example.com user2@example.com user3@example.com; do
  echo "Sending to $email..."
  DEBUG=mailgoat:timing mailgoat send \
    --to "$email" \
    --subject "Batch Email" \
    --body "Hello!" \
    2>&1 | grep "Completed: Send email operation"
done
```

Output:

```
Sending to user1@example.com...
✓ Completed: Send email operation (247ms)
Sending to user2@example.com...
✓ Completed: Send email operation (251ms)
Sending to user3@example.com...
✓ Completed: Send email operation (429ms)  👈 This one was slower
```

## Example 10: CI/CD Pipeline Debugging

**Problem:** Email notifications failing in GitHub Actions.

**Solution:** Add debug logs to CI pipeline:

```yaml
# .github/workflows/notify.yml
- name: Send notification
  run: |
    mailgoat send \
      --to team@example.com \
      --subject "Build ${{ github.run_number }} completed" \
      --body "Success!" \
      --debug
  env:
    DEBUG: mailgoat:*
```

CI log will show:

```
[2026-02-15T19:00:00.010Z] [mailgoat:main] 🐛 Debug mode enabled
[2026-02-15T19:00:00.011Z] [mailgoat:main] Node version: v20.10.0
[2026-02-15T19:00:00.012Z] [mailgoat:main] Platform: linux x64
[2026-02-15T19:00:00.013Z] [mailgoat:main] CWD: /home/runner/work/myproject/myproject
...
[2026-02-15T19:00:00.250Z] [mailgoat:api] ← 200 OK
✓ Email sent successfully!
```

## Best Practices

### 1. Start with Full Debug

When troubleshooting unknown issues, enable all namespaces:

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```

### 2. Narrow Down with Namespaces

Once you know the problem area, use specific namespaces:

```bash
# Config issues
DEBUG=mailgoat:config mailgoat send ...

# API/network issues
DEBUG=mailgoat:api mailgoat send ...

# Performance issues
DEBUG=mailgoat:timing mailgoat send ...

# Validation issues
DEBUG=mailgoat:validation mailgoat send ...
```

### 3. Combine with JSON Output

Debug logs go to stderr, JSON output to stdout - perfect for scripts:

```bash
# Parse JSON output while seeing debug logs
result=$(mailgoat send --to user@example.com --subject "Test" --body "Hello" --json --debug)
message_id=$(echo "$result" | jq -r '.message_id')
```

### 4. Save Debug Logs for Later

Redirect stderr to a file:

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug 2> debug.log
```

### 5. Use grep to Filter

Debug logs are grep-friendly:

```bash
# Find timing info
mailgoat send ... --debug 2>&1 | grep "timing"

# Find errors
mailgoat send ... --debug 2>&1 | grep "Error"

# Find API calls
mailgoat send ... --debug 2>&1 | grep "→ POST"
```

## Common Patterns

### Pattern 1: "Can't connect" Error

```
✗ Error: getaddrinfo ENOTFOUND postal.example.com
```

**Check:**

1. Server hostname in config (`~/.mailgoat/config.yml`)
2. DNS resolution: `ping postal.example.com`
3. Firewall blocking outbound HTTPS

### Pattern 2: "Authentication failed" Error

```
← 401 Unauthorized
```

**Check:**

1. API key in config file
2. API key in Postal admin panel
3. API key permissions (can it send emails?)

### Pattern 3: "Rate limit exceeded" Error

```
← 429 Too Many Requests
```

**Solution:** Retries will handle this automatically. If persistent, add delays between sends.

### Pattern 4: Slow Performance

```
✓ Completed: Send message via API (5.2s)
```

**Check:**

1. Network speed: `speedtest-cli`
2. Postal server health
3. Attachment size (if any)

### Pattern 5: Validation Errors

```
Invalid email address: "user@"
```

**Fix:** Check input format according to validation rules.

## Tips

1. **Always check timing first** - Often reveals the problem immediately
2. **Use `--json` with `--debug`** - Separate machine-readable output from debug logs
3. **Save logs before sharing** - Review for sensitive data (already sanitized, but double-check)
4. **Combine with `set -x` in bash** - See both your script logic and MailGoat internals
5. **Check the full stack trace** - Error logs include stack traces for deeper debugging

## Getting Help

When reporting issues, include:

1. Full command with `--debug`
2. Debug logs (stderr)
3. Your environment (Node version, OS)
4. Config file (sanitize API key!)

```bash
# Capture everything for bug reports
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug > output.log 2>&1
```
