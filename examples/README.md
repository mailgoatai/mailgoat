# MailGoat Example Integrations

This directory contains practical examples showing how AI agents can use MailGoat for various use cases.

## Examples

### 1. Email Notification Agent
**File:** `notification-agent.sh`

Monitors system resources and sends alert emails when thresholds are exceeded. Demonstrates basic email sending with dynamic content.

**Use cases:**
- Server monitoring
- Resource alerts
- Error notifications
- Status updates

### 2. Inbox Processing Agent
**File:** `inbox-processor.sh`

Reads and processes incoming emails, extracting commands or data. Demonstrates inbox reading, filtering, and structured data extraction.

**Use cases:**
- Email-based command execution
- Automated ticket processing
- Data extraction from emails
- Email-triggered workflows

### 3. Automated Response Agent
**File:** `auto-responder.sh`

Analyzes incoming emails and sends intelligent responses based on content. Demonstrates reply functionality and content analysis.

**Use cases:**
- Customer support automation
- Out-of-office responses
- FAQ automation
- Email triage

### 4. Daily Digest Agent
**File:** `digest-agent.sh`

Aggregates information from multiple sources and sends a formatted summary email. Demonstrates HTML email formatting and scheduled execution.

**Use cases:**
- Daily reports
- News summaries
- Metric dashboards
- Status roundups

### 5. OpenClaw Integration
**File:** `openclaw-integration.js`

Shows how OpenClaw agents can use MailGoat within their workflows. Demonstrates error handling and JSON parsing.

**Use cases:**
- OpenClaw agent email capabilities
- Task automation via email
- Email-based triggers
- Integration with other OpenClaw tools

## Running the Examples

### Prerequisites

1. MailGoat CLI installed:
   ```bash
   npm install -g mailgoat
   ```

2. MailGoat configured with valid credentials:
   ```bash
   mailgoat config --email agent@example.com --api-key YOUR_KEY
   ```

3. For shell scripts: bash, jq, curl
4. For Node.js examples: Node.js v14+

### Running Individual Examples

Each example includes instructions in its header. Generally:

```bash
# Make executable
chmod +x examples/notification-agent.sh

# Run with environment variables
ALERT_EMAIL=admin@example.com ./examples/notification-agent.sh

# Or edit the script to set defaults
```

### Testing

All examples can be tested with mock data before deploying to production. See `../tests/` for test scenarios.

## Contributing Examples

When adding new examples:

1. Include a clear header with description and use cases
2. Add error handling and validation
3. Document environment variables and prerequisites
4. Include example output
5. Keep it simple - focus on demonstrating one concept
6. Add to this README

## Architecture

These examples assume the **Direct Mode** architecture (CLI → Postal API).

For managed/SaaS mode, the CLI commands remain the same - MailGoat handles the backend routing.

## Support

- Documentation: See `../docs/`
- Issues: File in MailGoat repository
- Questions: Check FAQ or ask in discussions
