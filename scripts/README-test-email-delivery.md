# MailGoat Email Delivery Test Suite

Automated test suite for validating email delivery across internal, external, and security configurations.

## Overview

This script tests:

✅ **Internal Delivery** - Agent-to-team email delivery  
✅ **Agent-to-Agent** - Direct peer communication  
✅ **External Delivery** - Gmail and Outlook delivery  
✅ **DKIM/SPF Validation** - Email authentication headers

## Prerequisites

### Required

- `bash` 4.0+
- `jq` - JSON parsing
- Either:
  - **MailGoat CLI** installed and configured, OR
  - **Postal API** access (server URL + API key)

### Installation

```bash
# Install jq
## Ubuntu/Debian
sudo apt-get install jq

## macOS
brew install jq

## Alpine
apk add jq
```

## Usage

### Basic Usage

```bash
# Run all tests (auto-detects CLI or API)
./test-email-delivery.sh

# Verbose mode
./test-email-delivery.sh --verbose

# Custom timeout (default: 30s)
./test-email-delivery.sh --timeout 60
```

### JSON Output

```bash
# Output as JSON
./test-email-delivery.sh --json

# Save JSON report to file
./test-email-delivery.sh --json --report results.json

# Pipe to jq for formatting
./test-email-delivery.sh --json | jq .
```

### Force Method

```bash
# Force MailGoat CLI (fail if not available)
./test-email-delivery.sh --use-cli

# Force Postal API
./test-email-delivery.sh --use-postal
```

## Configuration

### MailGoat CLI (Preferred)

If MailGoat CLI is installed and configured, the script will use it automatically:

```bash
# Check CLI is available
which mailgoat

# Verify configuration
mailgoat config --check
```

### Postal API (Fallback)

If CLI is not available, set environment variables:

```bash
export POSTAL_SERVER_URL="https://postal.example.com"
export POSTAL_API_KEY="your_api_key_here"

./test-email-delivery.sh
```

Or create a `.env` file:

```bash
# .env
POSTAL_SERVER_URL=https://postal.example.com
POSTAL_API_KEY=your_api_key_here
```

Then source it:

```bash
source .env
./test-email-delivery.sh
```

## Test Cases

### 1. Internal Delivery

Tests email delivery from each agent to team inbox:

```
dev1@mailgoat.ai → team@mailgoat.ai
dev2@mailgoat.ai → team@mailgoat.ai
dev3@mailgoat.ai → team@mailgoat.ai
```

**Expected:** All 3 emails arrive in team inbox within timeout.

### 2. Agent-to-Agent

Tests direct agent-to-agent communication:

```
dev1@mailgoat.ai → dev2@mailgoat.ai
dev2@mailgoat.ai → dev3@mailgoat.ai
dev3@mailgoat.ai → dev1@mailgoat.ai
```

**Expected:** All 3 emails delivered successfully.

### 3. External Delivery

Tests delivery to external email providers:

```
dev1@mailgoat.ai → test-mailgoat@gmail.com
dev1@mailgoat.ai → test-mailgoat@outlook.com
```

**Expected:** Emails sent successfully (manual verification required).

**Note:** External delivery requires manual checking of Gmail/Outlook inboxes to verify:

- Email arrived
- Not in spam folder
- Headers look correct

### 4. DKIM/SPF Validation

Analyzes recent emails for authentication headers:

- **DKIM:** Verifies `DKIM-Signature` header present
- **SPF:** Checks `Received-SPF` header contains "pass"

**Expected:** All analyzed messages have valid DKIM and SPF headers.

## Output Format

### Text Output (Default)

```
MailGoat Email Delivery Tests
==============================

Testing Internal Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] dev1@mailgoat.ai → team@mailgoat.ai: delivered
[✓] dev2@mailgoat.ai → team@mailgoat.ai: delivered
[✓] dev3@mailgoat.ai → team@mailgoat.ai: delivered

Testing Direct Agent-to-Agent Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] dev1@mailgoat.ai → dev2@mailgoat.ai: delivered
[✓] dev2@mailgoat.ai → dev3@mailgoat.ai: delivered
[✓] dev3@mailgoat.ai → dev1@mailgoat.ai: delivered

Testing External Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[!] Gmail test: Email sent (manual verification required)
[!] Outlook test: Email sent (manual verification required)

Testing DKIM/SPF Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] DKIM Validation: valid on 3/3 messages
[✓] SPF Validation: pass on 3/3 messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests:   12
Passed:        12
Failed:        0
Duration:      45s

✓ All tests passed!
```

### JSON Output

```json
{
  "timestamp": "2026-02-15T17:00:00Z",
  "duration_seconds": 45,
  "summary": {
    "total": 12,
    "passed": 12,
    "failed": 0
  },
  "results": [
    {
      "name": "dev1@mailgoat.ai → team@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "dev2@mailgoat.ai → team@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "dev3@mailgoat.ai → team@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "dev1@mailgoat.ai → dev2@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "dev2@mailgoat.ai → dev3@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "dev3@mailgoat.ai → dev1@mailgoat.ai",
      "result": "PASS"
    },
    {
      "name": "External (Gmail)",
      "result": "PASS"
    },
    {
      "name": "External (Outlook)",
      "result": "PASS"
    },
    {
      "name": "DKIM Validation",
      "result": "PASS"
    },
    {
      "name": "SPF Validation",
      "result": "PASS"
    }
  ]
}
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed
- Other - Configuration or execution error

## CI/CD Integration

### GitHub Actions

```yaml
name: Email Delivery Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: sudo apt-get install -y jq

      - name: Run email tests
        env:
          POSTAL_SERVER_URL: ${{ secrets.POSTAL_SERVER_URL }}
          POSTAL_API_KEY: ${{ secrets.POSTAL_API_KEY }}
        run: |
          ./scripts/test-email-delivery.sh --json --report results.json

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: results.json
```

### GitLab CI

```yaml
email-tests:
  stage: test
  image: ubuntu:latest
  before_script:
    - apt-get update && apt-get install -y jq curl
  script:
    - ./scripts/test-email-delivery.sh --json --report results.json
  artifacts:
    reports:
      junit: results.json
```

## Troubleshooting

### "jq not found"

Install jq:

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Alpine
apk add jq
```

### "mailgoat command not found"

Either:

1. Install MailGoat CLI:

   ```bash
   npm install -g mailgoat
   ```

2. Or use Postal API fallback:
   ```bash
   export POSTAL_SERVER_URL="https://postal.example.com"
   export POSTAL_API_KEY="your_key"
   ./test-email-delivery.sh --use-postal
   ```

### "Timeout waiting for delivery"

- **Check Postal server** - Is it running and reachable?
- **Increase timeout** - Use `--timeout 60` for slower networks
- **Check DNS** - Are MX records configured correctly?
- **Check logs** - Look at Postal server logs for errors

### "DKIM/SPF validation failed"

- **DKIM:** Ensure DKIM keys are configured in Postal
- **SPF:** Verify SPF DNS records are set up correctly
- **Check DNS propagation** - DNS changes can take time
- **Postal config** - Confirm DKIM signing is enabled

### External delivery tests failing

- **Gmail/Outlook setup** - Ensure test email addresses exist
- **Manual check** - External tests require manual verification
- **Spam folder** - Check if emails went to spam
- **Rate limiting** - External providers may rate-limit test emails

## Advanced Usage

### Custom Test Agents

Edit the script to test different email addresses:

```bash
# In test-email-delivery.sh
declare -a TEST_AGENTS=(
  "agent1@yourdomain.com"
  "agent2@yourdomain.com"
  "agent3@yourdomain.com"
)

TEAM_EMAIL="team@yourdomain.com"
```

### Parallel Execution

For faster tests, run test suites in parallel:

```bash
# Run internal tests in background
./test-email-delivery.sh --json | jq '.results[] | select(.name | contains("team"))' &

# Run agent-to-agent tests
./test-email-delivery.sh --json | jq '.results[] | select(.name | contains("→"))' &

wait
```

### Scheduled Testing

Add to crontab for periodic testing:

```bash
# Test email delivery every hour
0 * * * * /path/to/test-email-delivery.sh --json --report /var/log/mailgoat-tests.json
```

## Extending the Script

### Add Custom Tests

Add a new test function:

```bash
test_custom_scenario() {
  echo ""
  log INFO "Testing Custom Scenario"
  log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Your test logic here
  local subject="[TEST] Custom test"
  local body="Custom test at $(date)"

  if send_email "from@example.com" "to@example.com" "$subject" "$body"; then
    if wait_for_delivery "to@example.com" "$subject" 30; then
      record_test "Custom Test" "true" "passed"
    else
      record_test "Custom Test" "false" "timeout"
    fi
  else
    record_test "Custom Test" "false" "send failed"
  fi
}

# Call in main()
main() {
  # ... existing code ...
  test_custom_scenario
  # ... rest of main ...
}
```

## Performance

Expected runtime:

- **Internal tests:** ~10-15 seconds
- **Agent-to-agent tests:** ~15-20 seconds
- **External tests:** ~5 seconds (send only)
- **DKIM/SPF checks:** ~5-10 seconds
- **Total:** ~35-50 seconds

Factors affecting performance:

- Network latency to Postal server
- Email delivery speed
- Timeout settings
- Number of messages to analyze

## Security

⚠️ **Important:**

- **API Keys:** Never commit Postal API keys to git
- **Use secrets:** Store keys in environment variables or CI secrets
- **Test accounts:** Use dedicated test email addresses
- **Permissions:** Ensure script has minimal required permissions
- **Logs:** Be careful not to log sensitive information

## Support

- **Issues:** Report bugs in MailGoat repository
- **Documentation:** https://docs.mailgoat.dev
- **Community:** https://discord.gg/mailgoat

## License

MIT - Same as MailGoat project
