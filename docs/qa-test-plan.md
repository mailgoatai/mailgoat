# MailGoat MVP - QA Test Plan

**QA Lead:** @qa  
**Date:** 2026-02-15  
**Status:** Draft - Ready for Review  
**Version:** 1.0

---

## Executive Summary

This test plan provides comprehensive quality assurance coverage for MailGoat CLI v0.1 MVP. It covers functional testing, integration testing, documentation validation, user experience evaluation, and performance benchmarking.

**Testing Philosophy:** Agent-first validation - all tests are designed from an AI agent's perspective, ensuring the CLI is intuitive, reliable, and scriptable.

**Scope:** Direct mode only (CLI → Postal). Backend/SaaS testing deferred to Phase 2.

**Timeline:**
- **Preparation Phase (Current):** Design test cases, set up test environment
- **Execution Phase:** Once Developer 1's CLI is ready for testing
- **Sign-off:** MVP release approval after all critical tests pass

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Functional Test Plan](#2-functional-test-plan)
3. [Integration Test Plan](#3-integration-test-plan)
4. [Documentation Testing](#4-documentation-testing)
5. [User Experience Testing](#5-user-experience-testing)
6. [Performance & Reliability](#6-performance--reliability)
7. [Test Execution Tracking](#7-test-execution-tracking)
8. [Bug Tracking](#8-bug-tracking)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Test Schedule](#10-test-schedule)

---

## 1. Test Environment Setup

### 1.1 Prerequisites

**Required Infrastructure:**
- Postal instance (Docker deployment)
- DNS configuration (MX, SPF, DKIM for test domain)
- Test domain (e.g., `mailgoat-test.dev`)
- Multiple test email accounts

**Test Environments:**
- **Clean install environment:** Fresh Linux VM/container for installation testing
- **OpenClaw environment:** OpenClaw instance with exec tool access
- **Shell scripting environment:** Bash/zsh for integration testing

### 1.2 Test Data Setup

**Test Email Accounts:**
```
sender1@mailgoat-test.dev     (primary agent account)
sender2@mailgoat-test.dev     (secondary agent account)
recipient@mailgoat-test.dev   (test recipient)
external@gmail.com            (external recipient for deliverability testing)
```

**Test Files:**
```
tests/fixtures/
├── test-attachment-small.pdf      (500 KB)
├── test-attachment-large.pdf      (20 MB)
├── test-html-email.html           (HTML template)
├── test-body-long.txt             (10KB text)
├── test-body-special-chars.txt    (Unicode, emojis, symbols)
└── test-config-valid.yml          (valid config file)
```

### 1.3 Postal Test Instance Setup

**Configuration:**
- Docker Compose deployment following Developer 2's guide
- DNS records configured
- Test organization and server created
- API credentials generated
- SMTP ports open (25, 587)

**Validation:**
- Postal web UI accessible
- Test send via Postal UI succeeds
- Test receive via Postal UI succeeds
- API credentials work with curl

### 1.4 Test Tools

**Required:**
- `curl` (API testing)
- `jq` (JSON parsing)
- `mailgoat` CLI (installed via npm)
- `bash` (shell scripting)
- Time measurement tool (`time`, `hyperfine`)
- Memory profiler (`ps`, `top`, `htop`)

---

## 2. Functional Test Plan

### 2.1 Installation & Configuration Tests

#### TC-INSTALL-001: Fresh Installation via npm
**Objective:** Verify agent can install MailGoat via npm

**Preconditions:** Clean system with Node.js installed

**Steps:**
1. Run `npm install -g mailgoat`
2. Verify binary installed: `which mailgoat`
3. Run `mailgoat --version`

**Expected Results:**
- Installation completes without errors
- Binary located in global npm bin directory
- Version number displayed correctly

**Priority:** P0 (Blocker)

---

#### TC-INSTALL-002: Configuration via `mailgoat init`
**Objective:** Verify initial configuration flow

**Steps:**
1. Run `mailgoat init`
2. Provide test credentials when prompted:
   - Server: `https://postal-test.example.com`
   - Email: `sender1@mailgoat-test.dev`
   - API Key: `test_api_key_123`
3. Verify config file created at `~/.mailgoat/config.yml`
4. Check file permissions: `ls -la ~/.mailgoat/config.yml`

**Expected Results:**
- Interactive prompts appear
- Config file created with correct values
- File permissions set to 600 (user-only read/write)
- Test connection succeeds

**Priority:** P0 (Blocker)

---

#### TC-INSTALL-003: Configuration via Command-Line Flags
**Objective:** Verify non-interactive configuration

**Steps:**
```bash
mailgoat init \
  --server https://postal-test.example.com \
  --email sender1@mailgoat-test.dev \
  --api-key test_api_key_123
```

**Expected Results:**
- Config file created without prompts
- Values match provided flags
- Connection tested automatically

**Priority:** P1 (Major)

---

#### TC-CONFIG-001: Invalid API Key
**Objective:** Verify error handling for invalid credentials

**Steps:**
1. Configure with invalid API key
2. Run `mailgoat status`

**Expected Results:**
- Clear error message: "Invalid API key. Run `mailgoat init` to reconfigure."
- Exit code: non-zero
- No crashes or stack traces

**Priority:** P0 (Blocker)

---

#### TC-CONFIG-002: Missing Configuration File
**Objective:** Verify behavior when config missing

**Steps:**
1. Delete `~/.mailgoat/config.yml`
2. Run `mailgoat send --to test@example.com --subject "Test" --body "Test"`

**Expected Results:**
- Error message prompts to run `mailgoat init`
- No crash
- Exit code: non-zero

**Priority:** P1 (Major)

---

#### TC-CONFIG-003: Corrupted Configuration File
**Objective:** Verify handling of malformed YAML

**Steps:**
1. Edit `~/.mailgoat/config.yml` with invalid YAML syntax
2. Run `mailgoat status`

**Expected Results:**
- Parse error with helpful message
- Suggests fixing or re-running `mailgoat init`

**Priority:** P2 (Minor)

---

### 2.2 Email Sending Tests

#### TC-SEND-001: Basic Email Send
**Objective:** Send simple email successfully

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Test Email" \
  --body "This is a test message."
```

**Expected Results:**
- Success message displayed
- Message ID returned
- Email received in Postal (verify via Postal UI or inbox)
- Exit code: 0

**Priority:** P0 (Blocker)

---

#### TC-SEND-002: Multiple Recipients (To)
**Objective:** Send to multiple recipients via `--to`

**Steps:**
```bash
mailgoat send \
  --to "recipient1@mailgoat-test.dev,recipient2@mailgoat-test.dev" \
  --subject "Multi-recipient Test" \
  --body "Testing multiple recipients."
```

**Expected Results:**
- Both recipients receive the email
- Success message confirms all recipients

**Priority:** P0 (Blocker)

---

#### TC-SEND-003: CC and BCC Recipients
**Objective:** Verify CC and BCC functionality

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --cc cc-user@mailgoat-test.dev \
  --bcc bcc-user@mailgoat-test.dev \
  --subject "CC/BCC Test" \
  --body "Testing CC and BCC."
```

**Expected Results:**
- All three recipients receive email
- CC recipient visible in headers
- BCC recipient NOT visible to others
- BCC recipient receives email

**Priority:** P1 (Major)

---

#### TC-SEND-004: Subject with Special Characters
**Objective:** Test Unicode and special characters in subject

**Test Data:**
```
Subject examples:
- "Hello 🎉 Emoji Test"
- "Spécial Çhàrs Tëst"
- "Chinese 测试 Test"
- "Symbols !@#$%^&*()"
```

**Expected Results:**
- Email sent successfully
- Subject rendered correctly in recipient's inbox
- No encoding errors

**Priority:** P1 (Major)

---

#### TC-SEND-005: Long Body Content
**Objective:** Send email with 10KB+ body

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Long Body Test" \
  --body "$(cat tests/fixtures/test-body-long.txt)"
```

**Expected Results:**
- Email sent successfully
- Full body content received
- No truncation

**Priority:** P1 (Major)

---

#### TC-SEND-006: Empty Body
**Objective:** Send email with subject but no body

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Empty Body Test"
```

**Expected Results:**
- Email sent successfully (body is optional)
- OR: Prompt asking if body should be empty
- No crash

**Priority:** P2 (Minor)

---

#### TC-SEND-007: HTML Email
**Objective:** Send HTML-formatted email

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "HTML Test" \
  --html tests/fixtures/test-html-email.html
```

**Expected Results:**
- HTML email sent successfully
- Rendered correctly in recipient's inbox
- Plaintext fallback present (if supported by Postal)

**Priority:** P1 (Major)

---

#### TC-SEND-008: Email with Small Attachment
**Objective:** Attach small file (500KB PDF)

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Attachment Test" \
  --body "See attached file." \
  --attach tests/fixtures/test-attachment-small.pdf
```

**Expected Results:**
- Email sent with attachment
- Attachment received correctly
- File size and name intact

**Priority:** P1 (Major)

---

#### TC-SEND-009: Email with Large Attachment
**Objective:** Test attachment size limits (20MB)

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Large Attachment Test" \
  --body "Large file attached." \
  --attach tests/fixtures/test-attachment-large.pdf
```

**Expected Results:**
- If within Postal's limit (25MB): Success
- If exceeds limit: Clear error message about size limit
- No crash

**Priority:** P1 (Major)

---

#### TC-SEND-010: Multiple Attachments
**Objective:** Send email with 3+ attachments

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Multiple Attachments" \
  --body "Multiple files attached." \
  --attach file1.pdf \
  --attach file2.txt \
  --attach image.png
```

**Expected Results:**
- All attachments sent successfully
- All attachments received

**Priority:** P2 (Minor)

---

#### TC-SEND-011: Invalid Recipient Email
**Objective:** Error handling for malformed email address

**Steps:**
```bash
mailgoat send \
  --to "not-an-email" \
  --subject "Test" \
  --body "Test"
```

**Expected Results:**
- Error message: "Invalid email address: not-an-email"
- Exit code: non-zero
- No API call made (validated client-side)

**Priority:** P1 (Major)

---

#### TC-SEND-012: Network Timeout
**Objective:** Handle Postal API timeout

**Setup:** Block Postal API endpoint temporarily

**Expected Results:**
- Retry attempts with backoff (max 3)
- Clear error after retries exhausted
- Timeout message includes Postal server URL

**Priority:** P1 (Major)

---

#### TC-SEND-013: JSON Output Mode
**Objective:** Verify structured JSON output

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "JSON Test" \
  --body "Testing JSON output." \
  --json
```

**Expected Results:**
- Valid JSON output
- Parseable by `jq`
- Contains: `status`, `message_id`, `timestamp`

**Priority:** P0 (Blocker)

---

#### TC-SEND-014: Read Body from stdin
**Objective:** Support piped body content

**Steps:**
```bash
echo "Body from stdin" | mailgoat send \
  --to recipient@mailgoat-test.dev \
  --subject "Stdin Test"
```

**Expected Results:**
- Body read from stdin
- Email sent successfully

**Priority:** P2 (Minor)

---

#### TC-SEND-015: Custom From Address
**Objective:** Override default sender

**Steps:**
```bash
mailgoat send \
  --to recipient@mailgoat-test.dev \
  --from custom@mailgoat-test.dev \
  --subject "Custom From" \
  --body "Testing custom from."
```

**Expected Results:**
- Email sent with custom from address
- Postal validates sender is authorized for this domain

**Priority:** P2 (Minor)

---

### 2.3 Email Receiving Tests

#### TC-RECEIVE-001: List All Messages (Inbox)
**Objective:** Fetch and display all inbox messages

**Preconditions:** Send 5 test emails to inbox

**Steps:**
```bash
mailgoat inbox
```

**Expected Results:**
- Table format displayed
- Shows: ID, From, Subject, Received time
- All 5 messages listed
- Exit code: 0

**Priority:** P0 (Blocker)

---

#### TC-RECEIVE-002: List Unread Messages Only
**Objective:** Filter by unread status

**Preconditions:** 
- 5 messages in inbox
- Mark 2 as read

**Steps:**
```bash
mailgoat inbox --unread
```

**Expected Results:**
- Only 3 unread messages shown
- Read messages filtered out

**Priority:** P1 (Major)

---

#### TC-RECEIVE-003: Filter by Time Range (Since)
**Objective:** Time-based filtering

**Steps:**
```bash
mailgoat inbox --since "24h"
mailgoat inbox --since "2026-02-14"
```

**Expected Results:**
- Only messages within time range shown
- Both relative ("24h") and absolute dates work

**Priority:** P1 (Major)

---

#### TC-RECEIVE-004: Limit Results
**Objective:** Pagination via limit

**Steps:**
```bash
mailgoat inbox --limit 10
```

**Expected Results:**
- Max 10 messages shown
- No errors if inbox has fewer than 10

**Priority:** P2 (Minor)

---

#### TC-RECEIVE-005: Empty Inbox
**Objective:** Handle empty inbox gracefully

**Preconditions:** Empty inbox

**Steps:**
```bash
mailgoat inbox
```

**Expected Results:**
- Friendly message: "No messages in your inbox."
- No error or crash
- Exit code: 0

**Priority:** P1 (Major)

---

#### TC-RECEIVE-006: JSON Output (Inbox)
**Objective:** Structured JSON for inbox listing

**Steps:**
```bash
mailgoat inbox --json
```

**Expected Results:**
- Valid JSON array
- Each message has: `id`, `from`, `subject`, `received`, `unread`
- Parseable by `jq`

**Priority:** P0 (Blocker)

---

#### TC-RECEIVE-007: Read Specific Message
**Objective:** Display full message content

**Preconditions:** Know message ID from inbox

**Steps:**
```bash
mailgoat read msg_001
```

**Expected Results:**
- Full message displayed: From, To, Subject, Date, Body
- Attachments listed (if any)
- Exit code: 0

**Priority:** P0 (Blocker)

---

#### TC-RECEIVE-008: Read Message with Attachments
**Objective:** Display attachment metadata

**Preconditions:** Message with 2 attachments

**Steps:**
```bash
mailgoat read msg_with_attachments
```

**Expected Results:**
- Attachments section shows:
  - Filename
  - Size (in KB/MB)
- No automatic download (MVP)

**Priority:** P1 (Major)

---

#### TC-RECEIVE-009: Read Nonexistent Message
**Objective:** Error handling for invalid ID

**Steps:**
```bash
mailgoat read msg_does_not_exist
```

**Expected Results:**
- Error message: "Message not found: msg_does_not_exist"
- Exit code: non-zero
- No crash

**Priority:** P1 (Major)

---

#### TC-RECEIVE-010: JSON Output (Read Message)
**Objective:** Structured JSON for message details

**Steps:**
```bash
mailgoat read msg_001 --json
```

**Expected Results:**
- Valid JSON object
- Contains: `id`, `from`, `to`, `subject`, `date`, `body`, `unread`, `attachments`
- Parseable by `jq`

**Priority:** P0 (Blocker)

---

#### TC-RECEIVE-011: Mark Message as Read
**Objective:** Update read status

**Preconditions:** Unread message

**Steps:**
```bash
mailgoat mark-read msg_001
mailgoat inbox --unread
```

**Expected Results:**
- Success confirmation
- Message no longer in `--unread` list

**Priority:** P1 (Major)

---

#### TC-RECEIVE-012: Mark Message as Unread
**Objective:** Toggle read status

**Preconditions:** Read message

**Steps:**
```bash
mailgoat mark-unread msg_001
mailgoat inbox --unread
```

**Expected Results:**
- Message now appears in `--unread` list

**Priority:** P2 (Minor)

---

### 2.4 Status & Health Check Tests

#### TC-STATUS-001: Check Connection Status
**Objective:** Verify `mailgoat status` command

**Steps:**
```bash
mailgoat status
```

**Expected Results:**
- Shows server URL
- Shows configured email
- Shows API key validity (✓ valid or ✗ invalid)
- Connection status

**Priority:** P1 (Major)

---

#### TC-STATUS-002: JSON Output (Status)
**Objective:** Structured status output

**Steps:**
```bash
mailgoat status --json
```

**Expected Results:**
- Valid JSON with: `server`, `email`, `api_key_valid`, `connection`

**Priority:** P2 (Minor)

---

### 2.5 Help & Documentation Tests

#### TC-HELP-001: Global Help Text
**Objective:** Verify `mailgoat --help`

**Steps:**
```bash
mailgoat --help
```

**Expected Results:**
- Lists all available commands
- Shows usage examples
- Links to documentation

**Priority:** P1 (Major)

---

#### TC-HELP-002: Command-Specific Help
**Objective:** Verify per-command help

**Steps:**
```bash
mailgoat send --help
mailgoat inbox --help
mailgoat read --help
```

**Expected Results:**
- Shows command usage
- Lists all flags/options
- Provides examples

**Priority:** P1 (Major)

---

#### TC-VERSION-001: Version Command
**Objective:** Display CLI version

**Steps:**
```bash
mailgoat --version
```

**Expected Results:**
- Shows version number (e.g., `0.1.0`)

**Priority:** P2 (Minor)

---

## 3. Integration Test Plan

### 3.1 OpenClaw Integration Tests

#### TC-OPENCLAW-001: Execute CLI from OpenClaw Agent
**Objective:** Verify OpenClaw can call MailGoat CLI

**Steps:**
1. In OpenClaw session, run:
```bash
exec mailgoat inbox --json
```

**Expected Results:**
- Command executes successfully
- JSON output parseable by OpenClaw
- Exit code captured correctly

**Priority:** P0 (Blocker)

---

#### TC-OPENCLAW-002: Send Email from OpenClaw
**Objective:** Agent sends email via exec tool

**Steps:**
```bash
exec mailgoat send --to test@example.com --subject "From OpenClaw" --body "Agent test" --json
```

**Expected Results:**
- Email sent successfully
- OpenClaw receives JSON response
- Agent can parse message_id

**Priority:** P0 (Blocker)

---

#### TC-OPENCLAW-003: Parse JSON Inbox in OpenClaw
**Objective:** Agent processes inbox JSON

**Steps:**
1. OpenClaw agent runs:
```bash
exec mailgoat inbox --unread --json
```
2. Agent parses JSON to extract message IDs
3. Agent reads each message

**Expected Results:**
- Agent successfully iterates through messages
- No JSON parsing errors
- Agent can make decisions based on message data

**Priority:** P0 (Blocker)

---

#### TC-OPENCLAW-004: Error Handling in Agent Context
**Objective:** Agent handles CLI errors gracefully

**Steps:**
1. Trigger error (e.g., invalid API key)
2. OpenClaw captures stderr

**Expected Results:**
- Agent receives non-zero exit code
- Error message available on stderr
- Agent can report error to user

**Priority:** P1 (Major)

---

### 3.2 Shell Script Integration Tests

#### TC-SHELL-001: Exit Codes
**Objective:** Verify proper exit codes for success/failure

**Test Cases:**
```bash
# Success cases (exit 0)
mailgoat status
mailgoat inbox
mailgoat send --to test@example.com --subject "Test" --body "Test"

# Failure cases (exit non-zero)
mailgoat send --to invalid-email --subject "Test" --body "Test"
mailgoat read nonexistent_message_id
```

**Expected Results:**
- Success: exit code 0
- Errors: exit code non-zero (1 or specific error code)
- `$?` captured correctly in bash

**Priority:** P0 (Blocker)

---

#### TC-SHELL-002: STDOUT vs STDERR Separation
**Objective:** Ensure proper output stream separation

**Steps:**
```bash
# Success - output to stdout
mailgoat inbox > output.txt 2> error.txt

# Error - output to stderr
mailgoat send --to invalid > output.txt 2> error.txt
```

**Expected Results:**
- Success messages go to stdout
- Error messages go to stderr
- Scripts can redirect appropriately

**Priority:** P1 (Major)

---

#### TC-SHELL-003: Piping and Chaining
**Objective:** Test CLI composability

**Test Cases:**
```bash
# Pipe JSON to jq
mailgoat inbox --json | jq '.[] | .id'

# Chain commands
mailgoat inbox --unread --json | jq -r '.[] | .id' | while read id; do
  mailgoat read "$id" --json | jq -r '.subject'
done

# Use in conditional
if mailgoat status; then
  echo "Connected"
else
  echo "Not connected"
fi
```

**Expected Results:**
- All pipes work correctly
- JSON output parseable by `jq`
- Conditionals work based on exit codes

**Priority:** P1 (Major)

---

#### TC-SHELL-004: Environment Variables
**Objective:** Override config via env vars

**Steps:**
```bash
export MAILGOAT_API_KEY="override_key"
mailgoat status
```

**Expected Results:**
- Env var takes precedence over config file
- Connection tested with override value

**Priority:** P2 (Minor)

---

### 3.3 Automated Test Suite

#### TC-AUTO-001: Test Runner Script
**Objective:** Create bash test runner

**Deliverable:** `tests/run-tests.sh`

**Functionality:**
- Sets up test environment
- Runs all functional tests
- Reports pass/fail
- Outputs summary

**Priority:** P1 (Major)

---

#### TC-AUTO-002: CI/CD Integration (Future)
**Objective:** Hook tests into GitHub Actions

**Out of Scope for MVP:** Document for Phase 2

**Priority:** P3 (Nice-to-have)

---

## 4. Documentation Testing

### 4.1 Self-Hosting Guide Validation

#### TC-DOC-001: Follow Postal Setup Guide
**Objective:** Validate Developer 2's setup guide

**Environment:** Clean Ubuntu 22.04 VM

**Steps:**
1. Follow every step in `docs/self-hosting-guide.md`
2. Time the installation process
3. Note any unclear or missing steps
4. Verify DNS configuration instructions
5. Test troubleshooting section

**Expected Results:**
- Setup completes in ≤ 30 minutes
- All commands work as documented
- Postal instance running and accessible
- Test email sent successfully

**Checklist:**
- [ ] Docker installation instructions clear
- [ ] DNS records documented correctly
- [ ] MX record example works
- [ ] SPF record example works
- [ ] DKIM setup clear
- [ ] Postal UI accessible
- [ ] Organization creation documented
- [ ] API credential generation clear
- [ ] Example configs work

**Bugs to Log:**
- Any command that doesn't work as written
- Missing prerequisites
- Unclear instructions
- Incorrect DNS examples

**Priority:** P0 (Blocker)

---

#### TC-DOC-002: CLI Installation Documentation
**Objective:** Validate README installation section

**Steps:**
1. Follow README.md installation instructions
2. Verify npm install command
3. Verify configuration steps
4. Test example commands

**Expected Results:**
- Installation works as documented
- Examples are copy-paste ready
- No errors or omissions

**Priority:** P0 (Blocker)

---

#### TC-DOC-003: CLI Usage Examples
**Objective:** Test every code example in docs

**Steps:**
1. Extract all code examples from:
   - `README.md`
   - `docs/cli-usage.md`
   - `docs/postal-setup.md`
2. Execute each example
3. Verify output matches documentation

**Expected Results:**
- All examples work without modification
- Outputs match documented behavior

**Priority:** P1 (Major)

---

#### TC-DOC-004: Troubleshooting Section
**Objective:** Validate troubleshooting guides

**Steps:**
1. Deliberately trigger each documented error
2. Follow troubleshooting steps
3. Verify resolution works

**Example Errors:**
- Invalid API key
- DNS misconfiguration
- Postal not running
- Network timeout

**Expected Results:**
- Each issue reproducible
- Troubleshooting steps resolve the issue

**Priority:** P1 (Major)

---

#### TC-DOC-005: Documentation Completeness Audit

**Checklist:**
- [ ] Installation instructions complete
- [ ] Configuration documented
- [ ] All commands documented
- [ ] All flags/options explained
- [ ] Examples provided for each command
- [ ] Error messages documented
- [ ] Troubleshooting section present
- [ ] FAQ included
- [ ] Links to GitHub, issues, Discord

**Priority:** P1 (Major)

---

## 5. User Experience Testing

### 5.1 Agent Perspective Evaluation

#### TC-UX-001: Error Message Clarity
**Objective:** Evaluate error messages from agent perspective

**Test Cases:**
1. Invalid email format
2. Missing API key
3. Network timeout
4. Message not found
5. Postal server down

**Evaluation Criteria:**
- Error message is actionable (tells agent what to do)
- No stack traces exposed
- Includes context (what operation failed)
- Suggests fix when possible

**Rating Scale:** 1-5 (5 = excellent, 1 = poor)

**Expected:** All errors rated ≥ 4

**Priority:** P0 (Blocker)

---

#### TC-UX-002: Help Text Usefulness
**Objective:** Evaluate `--help` from agent perspective

**Evaluation:**
1. Agent reads `mailgoat send --help`
2. Agent attempts to send email using only help text
3. Note any confusion or trial-and-error

**Expected:**
- Agent succeeds without consulting external docs
- Help text sufficient for basic usage

**Priority:** P1 (Major)

---

#### TC-UX-003: Command Name Intuitiveness
**Objective:** Are command names obvious?

**Test:**
1. Describe task to agent: "Send an email"
2. Agent guesses command (without docs)

**Commands to Test:**
- `mailgoat send` (send email)
- `mailgoat inbox` (list messages)
- `mailgoat read` (read message)
- `mailgoat status` (check connection)

**Expected:**
- Agent guesses correctly ≥ 80% of the time

**Priority:** P2 (Minor)

---

#### TC-UX-004: JSON Output Consistency
**Objective:** All commands have consistent JSON structure

**Validation:**
- Every `--json` output is valid JSON
- Success responses always include `status` field
- Error responses always include `error` field
- Timestamps use ISO 8601 format
- IDs are strings

**Priority:** P1 (Major)

---

#### TC-UX-005: Required vs Optional Flags
**Objective:** Is it clear what's required?

**Test:**
1. Run command with missing required flag
2. Check error message

**Example:**
```bash
mailgoat send --subject "Test"  # missing --to
```

**Expected:**
- Error clearly states: "Missing required flag: --to"
- Lists all required flags

**Priority:** P1 (Major)

---

### 5.2 Agent Workflow Testing

#### TC-WORKFLOW-001: First-Time Setup Flow
**Objective:** Time and evaluate onboarding experience

**Steps:**
1. Fresh install
2. Run `mailgoat init`
3. Send first email
4. Read inbox

**Metrics:**
- Time to first email sent: ≤ 5 minutes
- Number of commands needed: ≤ 5
- Number of docs consultations: ≤ 1

**Priority:** P0 (Blocker)

---

#### TC-WORKFLOW-002: Polling Loop (Agent Pattern)
**Objective:** Test realistic agent polling pattern

**Script:**
```bash
while true; do
  NEW=$(mailgoat inbox --unread --json | jq length)
  if [ "$NEW" -gt 0 ]; then
    echo "New mail: $NEW messages"
    mailgoat inbox --unread --json | jq -r '.[] | .id' | while read id; do
      mailgoat read "$id" --json
    done
  fi
  sleep 60
done
```

**Validation:**
- Script runs without errors
- No memory leaks over 1 hour
- Detects new messages reliably

**Priority:** P1 (Major)

---

#### TC-WORKFLOW-003: Automated Response Pattern
**Objective:** Agent reads inbox and replies

**Script:**
```bash
mailgoat inbox --unread --json | jq -r '.[] | select(.subject | contains("Support Request")) | .id' | while read id; do
  MESSAGE=$(mailgoat read "$id" --json)
  FROM=$(echo "$MESSAGE" | jq -r '.from')
  mailgoat send --to "$FROM" --subject "Re: Support Request" --body "We received your request."
  mailgoat mark-read "$id"
done
```

**Validation:**
- Script executes successfully
- Replies sent to correct addresses
- Messages marked as read

**Priority:** P1 (Major)

---

## 6. Performance & Reliability

### 6.1 Performance Benchmarks

#### TC-PERF-001: CLI Startup Time
**Objective:** Measure cold start performance

**Test:**
```bash
time mailgoat --version
```

**Expected:** ≤ 2 seconds

**Priority:** P1 (Major)

---

#### TC-PERF-002: Send Email Latency
**Objective:** Measure send operation performance

**Test:**
```bash
time mailgoat send --to test@example.com --subject "Test" --body "Performance test"
```

**Expected:** ≤ 5 seconds (including API call to Postal)

**Priority:** P1 (Major)

---

#### TC-PERF-003: Inbox Listing Performance
**Objective:** Measure inbox fetch time

**Preconditions:** 50 messages in inbox

**Test:**
```bash
time mailgoat inbox
```

**Expected:** ≤ 3 seconds

**Priority:** P1 (Major)

---

#### TC-PERF-004: JSON Parsing Performance
**Objective:** Large inbox JSON parsing

**Preconditions:** 100+ messages in inbox

**Test:**
```bash
time mailgoat inbox --json | jq '.[] | .id'
```

**Expected:** ≤ 5 seconds total

**Priority:** P2 (Minor)

---

#### TC-PERF-005: Large Attachment Upload
**Objective:** Time to send 20MB attachment

**Test:**
```bash
time mailgoat send --to test@example.com --subject "Large file" --attach tests/fixtures/test-attachment-large.pdf
```

**Expected:** ≤ 30 seconds (depends on network)

**Priority:** P2 (Minor)

---

### 6.2 Reliability Tests

#### TC-RELIABILITY-001: Retry Logic on Network Failure
**Objective:** Verify retry behavior

**Setup:**
1. Block Postal API with firewall rule
2. Run send command

**Expected:**
- Attempt 1: Initial try
- Attempt 2: Retry after delay
- Attempt 3: Retry after longer delay
- Final: Error message after 3 attempts
- Total time: ~10-15 seconds (with exponential backoff)

**Priority:** P1 (Major)

---

#### TC-RELIABILITY-002: Graceful Degradation (Postal Down)
**Objective:** Behavior when Postal unavailable

**Setup:** Stop Postal service

**Test:**
```bash
mailgoat send --to test@example.com --subject "Test" --body "Test"
```

**Expected:**
- Clear error: "Unable to connect to Postal server at https://postal.example.com"
- No stack trace
- Exit code: non-zero

**Priority:** P0 (Blocker)

---

#### TC-RELIABILITY-003: Memory Leak Detection
**Objective:** Long-running CLI stability

**Test:**
```bash
# Run 1000 inbox commands in loop
for i in {1..1000}; do
  mailgoat inbox > /dev/null
done
```

**Monitor:** Memory usage with `ps` or `htop`

**Expected:**
- Memory usage stable (no continuous growth)
- All commands complete successfully

**Priority:** P2 (Minor)

---

#### TC-RELIABILITY-004: Concurrent Execution
**Objective:** Multiple CLI processes

**Test:**
```bash
# Run 10 concurrent sends
for i in {1..10}; do
  mailgoat send --to test$i@example.com --subject "Concurrent $i" --body "Test" &
done
wait
```

**Expected:**
- All sends complete successfully
- No conflicts or corruption
- Config file not corrupted

**Priority:** P2 (Minor)

---

#### TC-RELIABILITY-005: Timeout Handling
**Objective:** Configurable timeout respected

**Setup:** Set timeout in config: `timeout: 5`

**Test:** Trigger slow API response

**Expected:**
- Operation times out after 5 seconds
- Clear timeout error message

**Priority:** P2 (Minor)

---

### 6.3 Security Tests

#### TC-SECURITY-001: Config File Permissions
**Objective:** Verify secure credential storage

**Test:**
```bash
ls -la ~/.mailgoat/config.yml
```

**Expected:**
- Permissions: `-rw-------` (600)
- Only readable by user
- Warning if permissions too open

**Priority:** P1 (Major)

---

#### TC-SECURITY-002: No API Key Logging
**Objective:** Verify credentials not logged

**Test:**
1. Enable debug logging (if available)
2. Run commands
3. Check logs/stdout

**Expected:**
- API key never appears in logs
- API key redacted or masked in debug output

**Priority:** P0 (Blocker)

---

#### TC-SECURITY-003: TLS Certificate Validation
**Objective:** Verify HTTPS certificate validation

**Setup:** Point to Postal instance with invalid cert

**Expected:**
- Connection refused with certificate error
- Clear error message about invalid certificate

**Priority:** P1 (Major)

---

## 7. Test Execution Tracking

### 7.1 Test Case Status Tracking

**Test Execution Spreadsheet Format:**

| Test ID | Test Name | Priority | Status | Date Tested | Tester | Notes | Bug ID |
|---------|-----------|----------|--------|-------------|--------|-------|--------|
| TC-INSTALL-001 | Fresh Installation | P0 | Not Run | - | - | - | - |
| TC-INSTALL-002 | Configuration Init | P0 | Not Run | - | - | - | - |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Status Values:**
- Not Run
- Pass
- Fail
- Blocked
- Skip

**Tracking Location:** `/home/node/.opengoat/organization/docs/qa-test-results.md`

---

### 7.2 Test Execution Phases

#### Phase 1: Preparation (Current)
**Tasks:**
- [x] Design test plan
- [ ] Set up Postal test instance
- [ ] Create test fixtures
- [ ] Prepare test environments
- [ ] Write test automation scripts

**Duration:** 1-2 days

---

#### Phase 2: Smoke Testing
**When:** First CLI build available

**Focus:**
- Core installation (TC-INSTALL-*)
- Basic send (TC-SEND-001)
- Basic inbox (TC-RECEIVE-001)

**Goal:** Verify basic functionality before deep testing

**Duration:** 2-4 hours

---

#### Phase 3: Functional Testing
**When:** Smoke tests pass

**Focus:**
- All sending tests (TC-SEND-*)
- All receiving tests (TC-RECEIVE-*)
- Configuration tests (TC-CONFIG-*)

**Duration:** 1-2 days

---

#### Phase 4: Integration Testing
**When:** Functional tests pass

**Focus:**
- OpenClaw integration (TC-OPENCLAW-*)
- Shell scripting (TC-SHELL-*)
- Agent workflows (TC-WORKFLOW-*)

**Duration:** 1 day

---

#### Phase 5: Documentation & UX Testing
**When:** Integration tests pass

**Focus:**
- Setup guide validation (TC-DOC-*)
- Error message evaluation (TC-UX-*)
- Help text review

**Duration:** 1 day

---

#### Phase 6: Performance & Reliability
**When:** All functional tests pass

**Focus:**
- Performance benchmarks (TC-PERF-*)
- Reliability tests (TC-RELIABILITY-*)
- Security validation (TC-SECURITY-*)

**Duration:** 1 day

---

#### Phase 7: Regression & Sign-off
**When:** All critical bugs fixed

**Focus:**
- Re-run P0 tests
- Verify bug fixes
- Final acceptance testing

**Duration:** 4-8 hours

---

## 8. Bug Tracking

### 8.1 Bug Report Template

```markdown
# Bug Report: [Short Description]

**Bug ID:** BUG-MAILGOAT-XXXX
**Reported By:** @qa
**Date:** YYYY-MM-DD
**Priority:** P0 / P1 / P2 / P3
**Status:** New / In Progress / Fixed / Closed / Won't Fix

## Summary
Brief description of the bug

## Test Case
TC-XXXX: Test Case Name

## Environment
- OS: Ubuntu 22.04 / macOS 13 / etc.
- Node version: v18.x.x
- CLI version: 0.1.0
- Postal version: X.X.X

## Steps to Reproduce
1. First step
2. Second step
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots/Logs
```
[paste error output or screenshots]
```

## Severity
- [ ] Blocker - Cannot test further
- [ ] Critical - Core functionality broken
- [ ] Major - Important feature doesn't work
- [ ] Minor - Cosmetic or edge case

## Reproducibility
- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (<50%)
- [ ] Once

## Workaround
Is there a workaround? If yes, describe:

## Additional Context
Any other relevant information
```

---

### 8.2 Bug Priority Definitions

**P0 - Blocker:**
- Installation fails completely
- Cannot configure CLI
- Cannot send email (basic use case)
- Cannot read inbox (basic use case)
- Security vulnerability
- Data loss

**P1 - Critical:**
- Important features don't work
- Error messages unhelpful
- Documentation incorrect
- Integration with OpenClaw broken

**P2 - Major:**
- Edge cases fail
- Performance below expectations
- UX issues
- Incomplete error handling

**P3 - Minor:**
- Cosmetic issues
- Nice-to-have features
- Optimization opportunities

---

### 8.3 Bug Tracking Location

**Repository:** TBD (coordinate with CEO on GitHub setup)

**Interim Location:** `/home/node/.opengoat/organization/bugs/`

**File Naming:** `BUG-MAILGOAT-[NUMBER]-[short-description].md`

**Example:** `BUG-MAILGOAT-001-install-fails-npm.md`

---

## 9. Acceptance Criteria

### 9.1 MVP Release Criteria

**All P0 tests must pass:**
- [ ] Fresh installation works (TC-INSTALL-001)
- [ ] Configuration works (TC-INSTALL-002)
- [ ] Basic send email works (TC-SEND-001)
- [ ] Basic inbox listing works (TC-RECEIVE-001)
- [ ] Read message works (TC-RECEIVE-007)
- [ ] JSON output works for send (TC-SEND-013)
- [ ] JSON output works for inbox (TC-RECEIVE-006)
- [ ] JSON output works for read (TC-RECEIVE-010)
- [ ] OpenClaw integration works (TC-OPENCLAW-001, 002, 003)
- [ ] Shell script exit codes work (TC-SHELL-001)
- [ ] Error messages are clear (TC-UX-001)
- [ ] Postal setup guide works (TC-DOC-001)
- [ ] No security issues (TC-SECURITY-002)
- [ ] Postal unavailable handled gracefully (TC-RELIABILITY-002)

**≥90% of P1 tests must pass:**
- Count P1 Pass / Total P1 Tests ≥ 0.90

**No P0 bugs open:**
- All blocker bugs resolved or deferred to post-MVP

**Documentation complete:**
- [ ] README.md finalized
- [ ] Postal setup guide tested and validated
- [ ] CLI usage examples work
- [ ] Troubleshooting section validated

---

### 9.2 Performance Criteria

- [ ] CLI startup ≤ 2 seconds
- [ ] Send email ≤ 5 seconds
- [ ] Inbox listing ≤ 3 seconds
- [ ] No memory leaks in 1000-iteration test

---

### 9.3 Integration Criteria

- [ ] OpenClaw agents can send email
- [ ] OpenClaw agents can read inbox
- [ ] OpenClaw agents can parse JSON output
- [ ] Shell scripts can use CLI in loops
- [ ] Exit codes work correctly

---

### 9.4 Documentation Criteria

- [ ] Setup guide takes ≤ 30 minutes
- [ ] All code examples work
- [ ] Troubleshooting section addresses common errors
- [ ] Help text sufficient for basic usage

---

## 10. Test Schedule

### Pre-Development Phase (Current - Week 1)
**Status:** In Progress

**Tasks:**
- [x] Design test plan
- [x] Define test cases
- [ ] Set up Postal test instance (QA)
- [ ] Create test fixtures (QA)
- [ ] Write test automation scripts (QA)
- [ ] Coordinate with Developer 3 on test scenarios

**Dependencies:** None

**Deliverables:**
- Test plan document ✓
- Test environment ready
- Test fixtures ready

---

### Development Phase (Week 2-3)
**Status:** Not Started

**Tasks:**
- Monitor CLI development progress
- Provide testability feedback to Developer 1
- Review documentation drafts from Developer 2
- Coordinate test case coverage with Developer 3

**Dependencies:** Developer 1 (CLI prototype)

---

### Smoke Testing Phase (Week 3)
**Status:** Not Started

**Trigger:** Developer 1 reports CLI core commands ready

**Duration:** 4 hours

**Focus:**
- Installation tests
- Basic send test
- Basic inbox test

**Gate:** Pass smoke tests before proceeding to functional testing

---

### Functional Testing Phase (Week 3-4)
**Status:** Not Started

**Duration:** 2 days

**Focus:**
- All sending tests (TC-SEND-*)
- All receiving tests (TC-RECEIVE-*)
- Configuration tests (TC-CONFIG-*)
- Status tests (TC-STATUS-*)
- Help tests (TC-HELP-*)

---

### Integration Testing Phase (Week 4)
**Status:** Not Started

**Duration:** 1 day

**Focus:**
- OpenClaw integration
- Shell script integration
- Agent workflows

---

### Documentation Testing Phase (Week 4)
**Status:** Not Started

**Duration:** 1 day

**Focus:**
- Postal setup guide validation
- CLI documentation validation
- Code example testing

**Coordination:** Work with Developer 2 to fix doc issues

---

### Performance & Reliability Testing Phase (Week 4)
**Status:** Not Started

**Duration:** 1 day

**Focus:**
- Performance benchmarks
- Reliability tests
- Security validation

---

### Bug Fix & Regression Testing Phase (Week 5)
**Status:** Not Started

**Duration:** 1-2 days (depends on bug count)

**Focus:**
- Verify all bug fixes
- Re-run P0 tests
- Regression testing

---

### Final Sign-off (Week 5)
**Status:** Not Started

**Duration:** 4 hours

**Tasks:**
- [ ] Review all test results
- [ ] Confirm acceptance criteria met
- [ ] Document known issues / limitations
- [ ] Sign off on MVP release
- [ ] Create release notes (QA input)

**Deliverable:** MVP Release Approval ✓ / ✗

---

## 11. Coordination with Other Developers

### 11.1 Developer 1 (CLI Development)

**Feedback Needed:**
- Early access to CLI builds for testing
- Testability considerations (e.g., mock mode for testing)
- Error message review
- JSON output schema review

**Communication Cadence:** Daily during development

---

### 11.2 Developer 2 (Documentation)

**Feedback Needed:**
- Review setup guide drafts
- Validation of code examples
- Identify unclear instructions
- Suggest additional troubleshooting entries

**Communication Cadence:** Every 2 days

---

### 11.3 Developer 3 (Test Scenarios & Examples)

**Coordination:**
- Avoid duplication of test cases
- QA focuses on manual/exploratory tests
- Developer 3 focuses on automated test suite
- Share test fixtures and environment setup

**Overlap:**
- Developer 3's examples can inform QA test cases
- QA's findings can inform Developer 3's automation

**Communication Cadence:** Weekly sync

---

## 12. Risk Assessment

### 12.1 High Risks

**Risk:** Postal instance setup too complex  
**Impact:** Can't test if Postal won't run  
**Mitigation:** Start Postal setup immediately; escalate blockers to @lead-engineer

**Risk:** CLI development delayed  
**Impact:** Testing timeline compressed  
**Mitigation:** Begin with documentation testing and test automation scripts while waiting

**Risk:** JSON schema changes frequently  
**Impact:** Integration tests break repeatedly  
**Mitigation:** Lock JSON schema early; document breaking changes

---

### 12.2 Medium Risks

**Risk:** Documentation incomplete or incorrect  
**Impact:** Setup guide validation fails  
**Mitigation:** Early review of drafts; tight coordination with Developer 2

**Risk:** OpenClaw environment issues  
**Impact:** Can't validate agent integration  
**Mitigation:** Test in multiple OpenClaw instances; fallback to manual shell testing

---

### 12.3 Low Risks

**Risk:** Test data cleanup issues  
**Impact:** Tests pollute each other's data  
**Mitigation:** Use unique test email addresses per test; reset Postal DB between runs

---

## 13. Test Deliverables Summary

### Documents
- [x] Test plan (this document)
- [ ] Test results spreadsheet (`qa-test-results.md`)
- [ ] Bug reports (in `/bugs/` directory)
- [ ] Test automation scripts (in `/tests/` directory)

### Test Artifacts
- [ ] Test environment setup guide
- [ ] Test fixtures (emails, attachments, configs)
- [ ] Performance benchmark results
- [ ] OpenClaw integration test scripts

### Reports
- [ ] Test execution summary (per phase)
- [ ] Bug summary report
- [ ] MVP release sign-off document
- [ ] Known issues / limitations document

---

## 14. Appendix

### A. Test Environment Details

**Postal Test Instance:**
- Host: TBD
- Version: Latest stable
- Domain: `mailgoat-test.dev`
- DNS: Configured with MX, SPF, DKIM

**OpenClaw Test Instance:**
- Version: Latest
- Agent: qa
- Workspace: Test workspace

**Test Machines:**
- Ubuntu 22.04 VM (primary)
- macOS 13 (secondary)
- Docker containers for clean-room testing

---

### B. Glossary

**MVP:** Minimum Viable Product - first release with core features  
**P0/P1/P2/P3:** Priority levels (0=highest, 3=lowest)  
**Smoke Test:** Quick validation of basic functionality  
**Regression Test:** Re-testing after bug fixes  
**Agent:** AI agent (OpenClaw or other framework)  
**Postal:** Open-source mail server (dependency)

---

### C. References

- Architecture spike: `/home/node/.opengoat/organization/docs/architecture-spike.md`
- MVP features: `/home/node/.opengoat/organization/docs/mvp-features.md`
- Postal docs: https://docs.postalserver.io
- Postal GitHub: https://github.com/postalserver/postal

---

### D. Changelog

**v1.0 - 2026-02-15:**
- Initial test plan created
- All test cases defined
- Acceptance criteria documented
- Test schedule outlined

---

**Prepared by:** @qa  
**Reviewed by:** [Pending]  
**Approved by:** [Pending]  
**Next Review:** After smoke testing phase