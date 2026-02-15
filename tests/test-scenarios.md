# MailGoat Test Scenarios

Comprehensive test case documentation for MailGoat CLI validation.

## Test Matrix Overview

| Category | Tests | Priority | Status |
|----------|-------|----------|--------|
| Sending | T001-T020 | P0-P1 | ✓ Defined |
| Receiving | T021-T035 | P0-P1 | ✓ Defined |
| Configuration | T036-T045 | P1-P2 | ✓ Defined |
| Error Handling | T046-T055 | P1 | ✓ Defined |
| Performance | T056-T065 | P2 | ✓ Defined |

**Priority Levels:**
- **P0 (Blocker):** Must pass for MVP release
- **P1 (Major):** Should pass for quality release
- **P2 (Minor):** Nice to have, can be deferred

## Sending Tests (T001-T020)

### T001: Send Simple Email (P0)

**Description:** Send a basic email with required fields only.

**Preconditions:**
- MailGoat CLI configured with valid credentials
- Network connectivity to Postal server

**Steps:**
1. Execute: `mailgoat send --to test@example.com --subject "Test" --body "Test body" --json`

**Expected Result:**
- Exit code: 0
- JSON response contains `message_id` field
- Email appears in recipient's inbox

**Pass Criteria:**
- Command completes successfully
- Valid JSON response returned
- Message ID is non-empty

---

### T002: Send to Multiple Recipients (P1)

**Description:** Send email to multiple recipients in the TO field.

**Steps:**
1. Execute: `mailgoat send --to "user1@example.com,user2@example.com,user3@example.com" --subject "Test" --body "Multiple recipients" --json`

**Expected Result:**
- Exit code: 0
- Email sent to all recipients
- Single message ID returned

**Pass Criteria:**
- All recipients receive the email
- No errors in output

---

### T003: Send with CC/BCC (P1)

**Description:** Send email with CC and BCC recipients.

**Steps:**
1. Execute: `mailgoat send --to main@example.com --cc cc@example.com --bcc bcc@example.com --subject "Test" --body "CC and BCC test" --json`

**Expected Result:**
- Exit code: 0
- TO and CC recipients see each other
- BCC recipient hidden from others

**Pass Criteria:**
- Email sent successfully
- BCC recipient receives email but is not visible to others

---

### T004: Send with Priority (P2)

**Description:** Send email with different priority levels.

**Steps:**
1. Execute: `mailgoat send --to test@example.com --subject "High Priority" --body "Urgent" --priority high --json`
2. Execute: `mailgoat send --to test@example.com --subject "Normal Priority" --body "Normal" --priority normal --json`
3. Execute: `mailgoat send --to test@example.com --subject "Low Priority" --body "FYI" --priority low --json`

**Expected Result:**
- All emails sent successfully
- Priority headers set correctly
- Email clients display priority accordingly

---

### T005: Send with HTML Body (P1)

**Description:** Send email with HTML-formatted content.

**Steps:**
1. Create HTML file: `test-email.html`
2. Execute: `mailgoat send --to test@example.com --subject "HTML Email" --html test-email.html --json`

**Expected Result:**
- Exit code: 0
- HTML content rendered correctly in email client
- Fallback to plain text if client doesn't support HTML

---

### T006: Send with Attachments (P1)

**Description:** Send email with file attachments.

**Steps:**
1. Create test file: `echo "test content" > attachment.txt`
2. Execute: `mailgoat send --to test@example.com --subject "With Attachment" --body "See attached" --attach attachment.txt --json`

**Expected Result:**
- Exit code: 0
- Attachment included in email
- File size and name correct

---

### T007: Invalid Recipient Email (P0)

**Description:** Attempt to send to invalid email address.

**Steps:**
1. Execute: `mailgoat send --to "not-an-email" --subject "Test" --body "Test"`

**Expected Result:**
- Exit code: Non-zero
- Error message indicates invalid email format
- No email sent

**Pass Criteria:**
- Validation error before API call
- Clear error message to user

---

### T008: Missing Required Fields (P0)

**Description:** Attempt to send without required fields.

**Steps:**
1. Execute: `mailgoat send --to test@example.com`
2. Execute: `mailgoat send --subject "No recipient"`
3. Execute: `mailgoat send --body "No subject"`

**Expected Result:**
- Exit code: Non-zero for each attempt
- Error message lists missing fields
- No emails sent

**Pass Criteria:**
- Validation prevents API call
- Helpful error messages

---

### T009: Authentication Failure (P0)

**Description:** Send with invalid API credentials.

**Steps:**
1. Set invalid API key: `export MAILGOAT_API_KEY="invalid_key_12345"`
2. Execute: `mailgoat send --to test@example.com --subject "Test" --body "Test"`

**Expected Result:**
- Exit code: Non-zero
- Error message indicates authentication failure
- No email sent

**Pass Criteria:**
- 401/403 error handled gracefully
- Clear authentication error message

---

### T010: Network Timeout (P1)

**Description:** Handle network timeout gracefully.

**Steps:**
1. Configure very short timeout: `export MAILGOAT_TIMEOUT=1`
2. Execute: `mailgoat send --to test@example.com --subject "Test" --body "Test"`

**Expected Result:**
- Exit code: Non-zero
- Error message indicates timeout
- No partial emails sent

**Pass Criteria:**
- Timeout handled without crash
- User-friendly error message

---

## Receiving Tests (T021-T035)

### T021: List All Messages (P0)

**Description:** List all messages in inbox.

**Steps:**
1. Execute: `mailgoat inbox --json`

**Expected Result:**
- Exit code: 0
- JSON array of messages
- Each message has required fields: id, from, subject, received_at

**Pass Criteria:**
- Valid JSON array returned
- Message fields present and correctly formatted

---

### T022: Filter Unread Messages (P0)

**Description:** List only unread messages.

**Steps:**
1. Execute: `mailgoat inbox --unread --json`

**Expected Result:**
- Exit code: 0
- JSON array of unread messages only
- Read messages excluded from results

**Pass Criteria:**
- Only unread messages returned
- Unread flag correctly interpreted

---

### T023: Read Specific Message (P0)

**Description:** Read full content of a specific message.

**Steps:**
1. Get message ID: `MSG_ID=$(mailgoat inbox --limit 1 --json | jq -r '.[0].id')`
2. Execute: `mailgoat read $MSG_ID --json`

**Expected Result:**
- Exit code: 0
- Full message details including body
- Message marked as read after retrieval

**Pass Criteria:**
- Complete message content returned
- All fields present (id, from, to, subject, body, headers, etc.)

---

### T024: Read with Expansions (P2)

**Description:** Read message with additional data (attachments, raw message).

**Steps:**
1. Execute: `mailgoat read $MSG_ID --expand attachments,raw --json`

**Expected Result:**
- Exit code: 0
- Response includes expanded data
- Attachments array present (if applicable)
- Raw message source available

---

### T025: Empty Inbox (P1)

**Description:** Handle empty inbox gracefully.

**Steps:**
1. Execute: `mailgoat inbox --json` (on fresh account)

**Expected Result:**
- Exit code: 0
- Empty JSON array: `[]`
- No errors

**Pass Criteria:**
- Empty array returned, not null or error
- User-friendly message if using text format

---

### T026: Invalid Message ID (P0)

**Description:** Attempt to read non-existent message.

**Steps:**
1. Execute: `mailgoat read invalid-message-id-12345`

**Expected Result:**
- Exit code: Non-zero
- Error message indicates message not found
- No crash or stack trace

**Pass Criteria:**
- 404 error handled gracefully
- Clear "message not found" error

---

### T027: JSON Output Parsing (P0)

**Description:** Validate JSON output is correctly formatted.

**Steps:**
1. Execute: `mailgoat inbox --json | jq .`
2. Execute: `mailgoat read $MSG_ID --json | jq .`

**Expected Result:**
- Valid JSON that parses without errors
- Consistent structure across calls
- Null values where appropriate, not missing keys

**Pass Criteria:**
- jq parses output without errors
- Schema consistent

---

### T028: Message Pagination (P1)

**Description:** List messages with limit and offset.

**Steps:**
1. Execute: `mailgoat inbox --limit 10 --json`
2. Execute: `mailgoat inbox --limit 10 --offset 10 --json`

**Expected Result:**
- Exit code: 0
- First call returns first 10 messages
- Second call returns next 10 messages
- No duplicates between pages

---

### T029: Time-based Filtering (P1)

**Description:** Filter messages by time range.

**Steps:**
1. Execute: `mailgoat inbox --since "1 hour ago" --json`
2. Execute: `mailgoat inbox --since "2024-01-01" --until "2024-12-31" --json`

**Expected Result:**
- Exit code: 0
- Only messages within time range returned
- Time formats parsed correctly

---

### T030: Multiple Inbox Fetches (P2)

**Description:** Ensure inbox fetches are idempotent.

**Steps:**
1. Execute: `mailgoat inbox --json` (multiple times)

**Expected Result:**
- Consistent results across calls
- No state changes from reading
- Performance consistent

---

## Configuration Tests (T036-T045)

### T036: Valid Config File (P0)

**Description:** Load and use valid configuration file.

**Steps:**
1. Create `~/.mailgoat/config.yml`:
   ```yaml
   server: postal.example.com
   email: agent@example.com
   api_key: test_key_12345
   ```
2. Execute: `mailgoat config --check`

**Expected Result:**
- Exit code: 0
- Config validated successfully
- Commands use config values

---

### T037: Missing Config File (P0)

**Description:** Handle missing configuration gracefully.

**Steps:**
1. Remove config file: `rm ~/.mailgoat/config.yml`
2. Execute: `mailgoat inbox`

**Expected Result:**
- Exit code: Non-zero
- Error message indicates missing config
- Helpful guidance on creating config

**Pass Criteria:**
- Clear error about missing config
- Points user to setup instructions

---

### T038: Invalid API Key (P0)

**Description:** Detect invalid API key in config.

**Steps:**
1. Set invalid key in config
2. Execute: `mailgoat inbox`

**Expected Result:**
- Exit code: Non-zero
- Authentication error
- Suggests checking API key

---

### T039: Invalid Server URL (P1)

**Description:** Handle invalid or unreachable server.

**Steps:**
1. Set invalid server: `server: https://invalid-domain-that-does-not-exist.com`
2. Execute: `mailgoat inbox`

**Expected Result:**
- Exit code: Non-zero
- Connection error
- Clear error message

---

### T040: Config File Permissions (P1)

**Description:** Warn about insecure config file permissions.

**Steps:**
1. Create config with open permissions: `chmod 777 ~/.mailgoat/config.yml`
2. Execute: `mailgoat inbox`

**Expected Result:**
- Warning about insecure permissions
- Suggest fixing: `chmod 600 config.yml`
- Command still works (warning only)

---

## Performance Tests (T056-T065)

### T056: CLI Startup Time (P2)

**Description:** Measure time from invocation to first output.

**Steps:**
1. Execute: `time mailgoat --version` (repeat 5 times)
2. Calculate average startup time

**Expected Result:**
- Average < 2 seconds
- Consistent across runs

**Pass Criteria:**
- Startup time within acceptable threshold

---

### T057: Send Operation Latency (P2)

**Description:** Measure time to send email.

**Steps:**
1. Execute: `time mailgoat send --to test@example.com --subject "Test" --body "Test"` (repeat 10 times)
2. Calculate average latency

**Expected Result:**
- Average < 5 seconds
- No significant variance

---

### T058: Inbox Fetch Latency (P2)

**Description:** Measure time to fetch inbox.

**Steps:**
1. Execute: `time mailgoat inbox --limit 10` (repeat 10 times)
2. Calculate average latency

**Expected Result:**
- Average < 3 seconds
- Consistent performance

---

### T060: Bulk Send (P2)

**Description:** Send 100 emails and measure throughput.

**Steps:**
1. Send 100 emails in sequence
2. Measure total time and calculate emails/second

**Expected Result:**
- All emails sent successfully
- Reasonable throughput (e.g., > 10 emails/sec)
- No rate limiting errors

---

### T061: Bulk Read (P2)

**Description:** Read 100 messages and measure throughput.

**Steps:**
1. Fetch 100 message IDs
2. Read each message
3. Measure total time

**Expected Result:**
- All messages read successfully
- Consistent performance
- No memory leaks

---

### T062: Memory Usage (P2)

**Description:** Monitor CLI memory usage during operations.

**Steps:**
1. Run CLI with memory profiling
2. Perform various operations
3. Check for memory leaks

**Expected Result:**
- Memory usage stays within reasonable bounds
- No memory leaks after repeated operations

---

### T063: CPU Usage (P2)

**Description:** Monitor CPU usage during operations.

**Steps:**
1. Run operations while monitoring CPU
2. Check CPU consumption

**Expected Result:**
- CPU usage reasonable for I/O-bound operations
- No CPU spikes or busy loops

---

### T064: Concurrent Operations (P2)

**Description:** Run multiple CLI operations concurrently.

**Steps:**
1. Start 5 inbox fetch operations simultaneously
2. Start 5 send operations simultaneously

**Expected Result:**
- All operations complete successfully
- No race conditions or conflicts
- Performance degrades gracefully

---

### T065: Long-running Stability (P2)

**Description:** Run CLI operations over extended period.

**Steps:**
1. Run inbox polling every 60 seconds for 1 hour
2. Monitor for stability issues

**Expected Result:**
- No crashes or hangs
- Consistent performance over time
- No resource exhaustion

---

## Test Execution Notes

### Test Data

- Use `example.com` domain for test emails
- Create dedicated test accounts
- Use consistent subject lines for easy identification
- Clean up test data after runs

### Environment Setup

```bash
# Set test credentials
export MAILGOAT_TEST_EMAIL="test-agent@example.com"
export MAILGOAT_TEST_API_KEY="test_key_12345"
export MAILGOAT_TEST_SERVER="postal.test.example.com"

# Configure test timeouts
export TEST_TIMEOUT=30
export TEST_VERBOSE=true
```

### Continuous Integration

All P0 tests must pass for merge approval.
All P1 tests should pass for release approval.
P2 tests are informational and help track quality trends.

### Test Reports

Results logged to `./test-logs/` directory:
- Individual test logs
- Full run logs
- Failure details
- Performance metrics

---

## Maintenance

**Adding New Tests:**
1. Assign next sequential test ID
2. Document in this file
3. Implement in `test-runner.sh`
4. Add fixtures if needed
5. Update test count in README

**Updating Tests:**
- Keep test IDs stable (don't renumber)
- Document changes in git commit
- Update expected results if CLI behavior changes
- Notify QA team of breaking changes

**Deprecating Tests:**
- Mark as SKIPPED in runner
- Document reason in this file
- Remove implementation after 2 releases
