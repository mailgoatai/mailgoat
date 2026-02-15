# MailGoat Examples and Test Suite

Comprehensive example integrations and automated test scenarios for MailGoat CLI validation.

**Created by:** @developer-3  
**Date:** 2026-02-15  
**Status:** ✅ Complete

---

## 📁 Directory Structure

```
/home/node/.opengoat/organization/
├── examples/               # 5 production-ready example scripts
│   ├── README.md           # Overview and usage guide (118 lines)
│   ├── notification-agent.sh        # System monitoring alerts (222 lines)
│   ├── inbox-processor.sh           # Email command execution (278 lines)
│   ├── auto-responder.sh            # Intelligent auto-replies (318 lines)
│   ├── digest-agent.sh              # Daily digest generation (342 lines)
│   └── openclaw-integration.js      # OpenClaw integration (408 lines)
│
└── tests/                  # Automated test framework
    ├── README.md           # Test suite guide (428 lines)
    ├── test-runner.sh      # Main test execution framework (708 lines)
    ├── test-scenarios.md   # Detailed test case docs (654 lines)
    └── fixtures/           # Test data
        ├── sample-email.txt
        ├── mock-inbox-response.json
        └── mock-message-response.json
```

**Total:** 3,541 lines of code and documentation

---

## 🎯 Example Integrations

### 1. Notification Agent (`notification-agent.sh`)
**Size:** 222 lines | **Type:** Bash  
**Use Case:** System monitoring and alerts

Monitors system resources (disk space, memory, CPU) and sends email alerts when thresholds are exceeded.

**Features:**
- Configurable thresholds (disk, memory, CPU)
- Continuous monitoring loop
- Color-coded terminal output
- Detailed alert emails with system info
- Graceful error handling

**Usage:**
```bash
ALERT_EMAIL=admin@example.com ./examples/notification-agent.sh
```

**Environment Variables:**
- `ALERT_EMAIL` - Email address for alerts
- `DISK_THRESHOLD` - Disk usage % threshold (default: 80)
- `MEM_THRESHOLD` - Memory usage % threshold (default: 85)
- `CPU_THRESHOLD` - CPU load % threshold (default: 90)
- `CHECK_INTERVAL` - Seconds between checks (default: 300)

---

### 2. Inbox Processor (`inbox-processor.sh`)
**Size:** 278 lines | **Type:** Bash  
**Use Case:** Email-based command execution

Reads incoming emails, extracts commands from subjects, and executes them automatically.

**Features:**
- Command prefix detection (e.g., "CMD: STATUS")
- Sender allowlist for security
- State tracking (avoid reprocessing)
- Command execution with result emails
- Dry-run mode for testing

**Usage:**
```bash
COMMAND_PREFIX="CMD:" ALLOWED_SENDERS="admin@example.com" ./examples/inbox-processor.sh
```

**Environment Variables:**
- `COMMAND_PREFIX` - Subject prefix for commands (default: "CMD:")
- `POLL_INTERVAL` - Seconds between inbox checks (default: 60)
- `ALLOWED_SENDERS` - Comma-separated sender allowlist
- `DRY_RUN` - Don't execute commands (default: false)

---

### 3. Auto-Responder (`auto-responder.sh`)
**Size:** 318 lines | **Type:** Bash  
**Use Case:** Intelligent automated responses

Analyzes email content and sends intelligent auto-replies based on keyword matching.

**Features:**
- Pattern matching with 6 built-in templates:
  - Pricing inquiries
  - Technical support
  - Getting started questions
  - Feature requests
  - Integration questions
  - Default catch-all
- JSON-based template system
- "HUMAN" keyword detection (skip automation)
- Response tracking and statistics

**Usage:**
```bash
AUTO_REPLY_ENABLED=true ./examples/auto-responder.sh
```

**Environment Variables:**
- `RESPONSE_TEMPLATES` - Path to templates JSON (default: ./response-templates.json)
- `POLL_INTERVAL` - Seconds between checks (default: 120)
- `AUTO_REPLY_ENABLED` - Enable automatic replies (default: true)
- `SIGNATURE` - Email signature to append

---

### 4. Daily Digest (`digest-agent.sh`)
**Size:** 342 lines | **Type:** Bash  
**Use Case:** Automated report generation

Aggregates information from multiple sources and sends formatted digest emails.

**Features:**
- Modular sections:
  - Weather forecast
  - System metrics
  - Git activity
  - Email statistics
  - Custom metrics
- HTML email formatting with CSS
- Cron-friendly design
- Configurable content modules

**Usage:**
```bash
DIGEST_EMAIL=team@example.com ./examples/digest-agent.sh
```

**Cron Example:**
```bash
# Send daily digest at 9 AM
0 9 * * * /path/to/digest-agent.sh
```

**Environment Variables:**
- `DIGEST_EMAIL` - Recipient email (required)
- `DIGEST_TITLE` - Custom title (default: "Daily Digest")
- `INCLUDE_WEATHER` - Include weather (default: true)
- `INCLUDE_SYSTEM` - Include system metrics (default: true)
- `INCLUDE_GIT` - Include git activity (default: true)
- `PROJECT_DIR` - Project directory for git stats

---

### 5. OpenClaw Integration (`openclaw-integration.js`)
**Size:** 408 lines | **Type:** Node.js  
**Use Case:** OpenClaw agent email capabilities

Node.js wrapper library showing how OpenClaw agents can use MailGoat.

**Features:**
- Wrapper functions:
  - `sendEmail()` - Send with options
  - `readInbox()` - Fetch messages
  - `readMessage()` - Read specific message
  - `processInbox()` - Process with callback
- Error handling and JSON parsing
- Timeout management
- 4 example workflows:
  - Send notification
  - Auto-reply to unread
  - Command processing
  - Daily digest

**Usage:**
```javascript
// As a module
const { sendEmail, readInbox } = require('./openclaw-integration.js');

await sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  body: 'Hello from OpenClaw!'
});

const { messages } = await readInbox({ unread: true });
```

**Or run directly:**
```bash
node examples/openclaw-integration.js
```

**Integration with OpenClaw:**
```javascript
// In OpenClaw agent workflow
await exec({
  command: 'node /path/to/openclaw-integration.js'
});
```

---

## 🧪 Test Suite

### Test Runner (`test-runner.sh`)
**Size:** 708 lines | **Type:** Bash  

Comprehensive automated test framework with 65+ test cases across 5 categories.

**Test Categories:**
1. **Sending Tests (T001-T020)** - Email sending functionality
2. **Receiving Tests (T021-T035)** - Inbox and message reading
3. **Configuration Tests (T036-T045)** - Config file handling
4. **Error Handling Tests (T046-T055)** - Failure scenarios
5. **Performance Tests (T056-T065)** - Latency and benchmarks

**Usage:**
```bash
# Run all tests
./tests/test-runner.sh

# Run specific suite
./tests/test-runner.sh --suite send

# Run with filter
./tests/test-runner.sh --filter "T00.*"

# Run single test
./tests/test-runner.sh --test-id T001

# Dry run (validate structure)
./tests/test-runner.sh --dry-run

# Verbose output
./tests/test-runner.sh --verbose

# JSON output for CI
./tests/test-runner.sh --report-format json

# JUnit XML for CI
./tests/test-runner.sh --report-format junit > results.xml
```

**Features:**
- 65 comprehensive test cases
- Multiple output formats (text, JSON, JUnit XML)
- Performance benchmarking
- Detailed logging (per-test log files)
- Fail-fast mode
- Flexible filtering (suite, pattern, test ID)
- CI/CD ready (exit codes, machine-readable output)

**Performance Thresholds:**
- CLI startup: < 2 seconds
- Send operation: < 5 seconds
- Inbox fetch: < 3 seconds

---

### Test Scenarios (`test-scenarios.md`)
**Size:** 654 lines | **Type:** Markdown  

Detailed documentation for all 65 test cases with priority levels.

**Structure:**
- Test ID (e.g., T001, T002)
- Description
- Preconditions
- Steps to execute
- Expected results
- Pass criteria
- Priority (P0 = Blocker, P1 = Major, P2 = Minor)

**Priority Distribution:**
- **P0 (Blocker):** 15 tests - Must pass for MVP
- **P1 (Major):** 38 tests - Should pass for quality release
- **P2 (Minor):** 12 tests - Nice to have, can defer

**Example Test:**
```
### T001: Send Simple Email (P0)

**Description:** Send a basic email with required fields only.

**Steps:**
1. Execute: mailgoat send --to test@example.com --subject "Test" --body "Test body" --json

**Expected Result:**
- Exit code: 0
- JSON response contains message_id field
- Email appears in recipient's inbox

**Pass Criteria:**
- Command completes successfully
- Valid JSON response returned
- Message ID is non-empty
```

---

### Test Documentation (`tests/README.md`)
**Size:** 428 lines | **Type:** Markdown  

Comprehensive guide to running and maintaining the test suite.

**Contents:**
- Quick start guide
- Prerequisites and installation
- Test modes (integration, mock, dry-run)
- Configuration options
- Environment variables
- Output formats
- CI/CD integration examples
- Docker usage
- Troubleshooting guide

**CI/CD Integration:**

**GitHub Actions Example:**
```yaml
name: MailGoat Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: ./tests/test-runner.sh --report-format junit > results.xml
```

**Docker Example:**
```bash
docker run --rm \
  -v $(pwd):/app \
  -w /app/tests \
  node:18 \
  ./test-runner.sh
```

---

## 🎯 Success Metrics

### Examples
✅ 5 production-ready example scripts  
✅ All 5 use cases covered (notification, inbox processing, auto-response, digest, OpenClaw)  
✅ Comprehensive documentation for each  
✅ Environment variable configuration  
✅ Error handling and validation  
✅ Executable and ready to run  

### Tests
✅ 65+ automated test cases  
✅ 5 test categories (send, receive, config, errors, performance)  
✅ Multiple output formats (text, JSON, JUnit)  
✅ CI/CD ready  
✅ Performance benchmarking  
✅ Detailed documentation  

---

## 🤝 Coordination

### For Developer 1 (CLI Implementation)
- Examples demonstrate expected CLI command structure
- Test scenarios validate all core commands
- JSON output format requirements specified
- Error handling expectations documented

**Use the examples to:**
- Validate CLI command syntax
- Test JSON output structure
- Verify error handling
- Benchmark performance

### For Developer 2 (Documentation)
- Examples show real-world usage patterns
- README files provide user-facing style
- Test scenarios can inform documentation examples

**Use the examples to:**
- Create documentation examples
- Build quickstart guides
- Develop use case descriptions

### For QA Team
- Test automation complements manual testing
- Automated tests cover happy path + edge cases
- Performance benchmarks provide quality metrics
- CI/CD integration for continuous validation

**Use the tests to:**
- Validate CLI releases
- Track performance trends
- Identify regressions
- Automate QA workflows

---

## 📦 Deliverables Summary

| Category | File | Lines | Description |
|----------|------|-------|-------------|
| **Examples** | | | |
| | README.md | 118 | Overview and usage guide |
| | notification-agent.sh | 222 | System monitoring alerts |
| | inbox-processor.sh | 278 | Email command execution |
| | auto-responder.sh | 318 | Intelligent auto-replies |
| | digest-agent.sh | 342 | Daily digest generation |
| | openclaw-integration.js | 408 | OpenClaw integration library |
| **Tests** | | | |
| | README.md | 428 | Test suite guide |
| | test-runner.sh | 708 | Test execution framework |
| | test-scenarios.md | 654 | Test case documentation |
| | fixtures/ | 65 | Test data (3 files) |
| **TOTAL** | | **3,541** | **12 files** |

---

## 🚀 Quick Start

### Run an Example
```bash
cd /home/node/.opengoat/organization

# Try the notification agent
ALERT_EMAIL=admin@example.com examples/notification-agent.sh

# Try the OpenClaw integration
node examples/openclaw-integration.js
```

### Run Tests
```bash
cd /home/node/.opengoat/organization/tests

# Run all tests
./test-runner.sh

# Run only send tests
./test-runner.sh --suite send

# Generate CI report
./test-runner.sh --report-format junit > results.xml
```

---

## 📖 Further Reading

- **Architecture Spike:** `/home/node/.opengoat/organization/docs/architecture-spike.md`
- **QA Test Plan:** `/home/node/.opengoat/organization/docs/qa-test-plan.md`
- **MVP Features:** `/home/node/.opengoat/organization/docs/mvp-features.md`

---

**Status:** ✅ All deliverables complete and ready for use

**Next Steps:**
1. Developer 1 can use examples/tests to validate CLI implementation
2. Developer 2 can reference examples in documentation
3. QA can integrate automated tests into validation workflow
4. Team can iterate on examples based on real-world feedback
