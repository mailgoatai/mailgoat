# MailGoat Test Suite

Automated test scenarios for validating MailGoat CLI functionality.

## Overview

This test suite provides automated testing for MailGoat CLI commands, covering:

- **Send functionality** - Email sending with various options
- **Receive functionality** - Inbox reading and message retrieval
- **Configuration** - Config file handling and validation
- **Error handling** - Invalid inputs and failure scenarios
- **Performance** - CLI startup time and API latency benchmarks

## Test Structure

```
tests/
├── README.md                    # This file
├── test-runner.sh              # Main test runner script
├── test-scenarios.md           # Detailed test case documentation
├── test-config.sh              # Test configuration and utilities
└── fixtures/                   # Test data and mock responses
    ├── sample-email.txt
    ├── mock-inbox-response.json
    └── mock-message-response.json
```

## Prerequisites

### Required

- Bash 4.0+
- MailGoat CLI installed
- `jq` for JSON parsing
- `curl` for API testing

### Optional (for full test suite)

- Running Postal instance OR mock server
- Valid MailGoat credentials
- `bc` for performance calculations

### Installation

```bash
# Install jq (if not already installed)
# Ubuntu/Debian
sudo apt-get install jq bc

# macOS
brew install jq bc

# Install MailGoat CLI (if not already installed)
npm install -g mailgoat
```

## Running Tests

### Quick Start

Run all tests with default configuration:

```bash
./test-runner.sh
```

### E2E Tests (Real Postal Environment)

Run real end-to-end tests (send -> deliver -> receive):

```bash
npm run test:e2e -- --runInBand
```

See `docs/e2e-testing.md` for required `MAILGOAT_E2E_*` environment variables and CI setup.

### Test Modes

**1. Integration Tests (requires real Postal instance)**
```bash
./test-runner.sh --mode integration
```

**2. Mock Tests (uses mock server/fixtures)**
```bash
./test-runner.sh --mode mock
```

**3. Dry Run (validates test structure without execution)**
```bash
./test-runner.sh --dry-run
```

### Specific Test Suites

Run only specific test categories:

```bash
# Only sending tests
./test-runner.sh --suite send

# Only receiving tests
./test-runner.sh --suite receive

# Only configuration tests
./test-runner.sh --suite config

# Only performance tests
./test-runner.sh --suite performance

# Multiple suites
./test-runner.sh --suite send,receive
```

### Filtering Tests

Run specific tests by name or pattern:

```bash
# Run tests matching pattern
./test-runner.sh --filter "send.*simple"

# Run single test by ID
./test-runner.sh --test-id T001
```

## Configuration

### Environment Variables

Configure test behavior with environment variables:

```bash
# MailGoat configuration
export MAILGOAT_TEST_EMAIL="agent@example.com"
export MAILGOAT_TEST_API_KEY="your_test_key"
export MAILGOAT_TEST_SERVER="postal.example.com"

# Test configuration
export TEST_TIMEOUT=30           # Timeout for individual tests (seconds)
export TEST_VERBOSE=true         # Verbose output
export TEST_FAIL_FAST=false      # Stop on first failure
export TEST_REPORT_FORMAT=text   # Output format: text, json, junit

# Performance thresholds
export PERF_STARTUP_MAX=2000     # Max CLI startup time (ms)
export PERF_SEND_MAX=5000        # Max send operation time (ms)
export PERF_INBOX_MAX=3000       # Max inbox fetch time (ms)
```

### Config File

Alternatively, create `test-config.local.sh`:

```bash
# Copy template
cp test-config.sh test-config.local.sh

# Edit with your settings
vim test-config.local.sh
```

## Test Scenarios

### Sending Tests (T001-T020)

- T001: Send simple email
- T002: Send to multiple recipients
- T003: Send with CC/BCC
- T004: Send with priority
- T005: Send with HTML body
- T006: Send with attachments
- T007: Invalid recipient email
- T008: Missing required fields
- T009: Authentication failure
- T010: Network timeout

### Receiving Tests (T021-T035)

- T021: List all messages
- T022: Filter unread messages
- T023: Read specific message
- T024: Read with expansions
- T025: Empty inbox
- T026: Invalid message ID
- T027: JSON output parsing
- T028: Message pagination
- T029: Time-based filtering
- T030: Multiple fetch calls

### Configuration Tests (T036-T045)

- T036: Valid config file
- T037: Missing config file
- T038: Invalid API key
- T039: Invalid server URL
- T040: Config file permissions
- T041: Environment variable override
- T042: Multiple profiles
- T043: Config validation
- T044: Config migration
- T045: Config reset

### Error Handling Tests (T046-T055)

- T046: Network error handling
- T047: API error responses
- T048: Malformed JSON responses
- T049: Rate limit handling
- T050: Timeout handling
- T051: Graceful degradation
- T052: Error message clarity
- T053: Exit code correctness
- T054: STDERR vs STDOUT separation
- T055: Retry logic

### Performance Tests (T056-T065)

- T056: CLI startup time
- T057: Send operation latency
- T058: Inbox fetch latency
- T059: Read message latency
- T060: Bulk send (100 emails)
- T061: Bulk read (100 messages)
- T062: Memory usage
- T063: CPU usage
- T064: Concurrent operations
- T065: Long-running stability

## Test Results

### Output Formats

**Text Format (default)**
```
Running MailGoat Test Suite
============================

[T001] Send simple email ............................ PASS (1.2s)
[T002] Send to multiple recipients .................. PASS (1.4s)
[T003] Send with CC/BCC ............................. FAIL (0.8s)
  Expected: Email sent successfully
  Got: Authentication failed

Test Summary
============
Total: 65
Passed: 63
Failed: 2
Skipped: 0
Time: 45.2s
Success Rate: 96.9%
```

**JSON Format**
```bash
./test-runner.sh --report-format json > test-results.json
```

**JUnit XML Format** (for CI integration)
```bash
./test-runner.sh --report-format junit > test-results.xml
```

### Test Logs

Detailed logs are saved to `./test-logs/`:

```
test-logs/
├── test-run-2026-02-15-1400.log     # Full test run log
├── T001-send-simple.log             # Individual test logs
├── T002-send-multiple.log
└── failures/                         # Failed test details
    └── T003-send-cc-bcc.log
```

## CI/CD Integration

### GitHub Actions

```yaml
name: MailGoat Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: |
          sudo apt-get install -y jq bc
          npm install -g mailgoat
      
      - name: Run tests
        env:
          MAILGOAT_TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          MAILGOAT_TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
        run: |
          cd tests
          ./test-runner.sh --report-format junit > results.xml
      
      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: MailGoat Tests
          path: tests/results.xml
          reporter: java-junit
```

### Docker

Run tests in isolated container:

```bash
docker run --rm \
  -v $(pwd):/app \
  -w /app/tests \
  -e MAILGOAT_TEST_EMAIL="test@example.com" \
  -e MAILGOAT_TEST_API_KEY="test_key" \
  node:18 \
  ./test-runner.sh
```

## Mock Server

For testing without a real Postal instance, use the included mock server:

```bash
# Start mock server
cd fixtures/mock-server
npm install
npm start

# Run tests against mock
export MAILGOAT_TEST_SERVER="localhost:3000"
./test-runner.sh --mode mock
```

## Writing New Tests

### Test Template

```bash
# tests/custom-test.sh

test_custom_scenario() {
  local test_id="T999"
  local test_name="Custom test scenario"
  
  test_start "$test_id" "$test_name"
  
  # Setup
  local test_email="test@example.com"
  
  # Execute
  local result=$(mailgoat send --to "$test_email" --subject "Test" --body "Body")
  local exit_code=$?
  
  # Assert
  if [ $exit_code -eq 0 ]; then
    test_pass "$test_id"
  else
    test_fail "$test_id" "Expected exit code 0, got $exit_code"
  fi
}
```

### Adding Tests

1. Add test function to `test-runner.sh`
2. Document in `test-scenarios.md`
3. Add fixtures if needed
4. Run test suite to validate

## Troubleshooting

### Common Issues

**1. MailGoat CLI not found**
```bash
# Check installation
which mailgoat

# Install if needed
npm install -g mailgoat
```

**2. Authentication failures**
```bash
# Verify credentials
mailgoat config --check

# Set test credentials
export MAILGOAT_TEST_API_KEY="your_key"
```

**3. jq not found**
```bash
# Install jq
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS
```

**4. Tests timing out**
```bash
# Increase timeout
export TEST_TIMEOUT=60

# Check network connectivity
curl -v https://postal.example.com
```

## Contributing

When adding new tests:

1. Follow existing test naming conventions
2. Add clear documentation
3. Include both positive and negative test cases
4. Test error handling paths
5. Add to appropriate test suite
6. Update this README

## Support

- Issues: File in MailGoat repository
- Questions: Check FAQ or ask in discussions
- CI/CD help: See GitHub Actions docs

## License

MIT - Same as MailGoat project
