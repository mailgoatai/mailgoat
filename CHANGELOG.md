# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-02-19

### Added

#### Email Sending & Templates
- Attachment support for `mailgoat send` via repeatable `--attach` flags
- Automatic MIME detection and base64 payload encoding for attachments
- Attachment size validation (warning above 10MB, hard failure above 25MB)
- **Template management system** via `mailgoat template`:
  - `template create` - Create reusable email templates with Handlebars support
  - `template list` - List all available templates
  - `template show <name>` - View template details
  - `template delete <name>` - Remove templates
  - `template render <name>` - Preview rendered templates with variable substitution
- **Batch email sending** via `mailgoat send-batch`:
  - Support for CSV, JSON, and JSONL batch file formats
  - Rate limiting and retry logic for reliable bulk sending
  - SQLite-based state tracking for resume capability
  - Progress reporting and failure logging

#### Inbox & Search
- Webhook-based inbox caching with SQLite storage
- Inbox commands:
  - `mailgoat inbox list` - List messages with filtering options
  - `mailgoat inbox list --unread` - Show only unread messages
  - `mailgoat inbox list --since <duration>` - Time-based filtering
  - `mailgoat inbox search "<query>"` - Search within inbox cache
- **Advanced search** via `mailgoat search`:
  - Full-text search across cached messages
  - Date range filtering (--from, --to, --since)
  - Tag-based filtering
  - Sender/recipient filtering
  - Attachment presence filtering
  - Sort by date, sender, subject, or size
  - Ascending/descending order control
- Mark-as-read behavior after successful `mailgoat read <message-id>`

#### Scheduling & Automation
- **Email scheduler** via `mailgoat scheduler`:
  - `scheduler add` - Schedule emails for future delivery
  - `scheduler list` - View pending scheduled emails
  - `scheduler cancel <id>` - Cancel scheduled sends
  - `scheduler run` - Process due emails (for cron integration)
  - SQLite-based persistence for scheduled email queue

#### Webhooks
- **Webhook server** via `mailgoat webhook`:
  - `webhook serve` - Run webhook receiver server with TLS support
  - `webhook replay` - Replay webhook events from log files
  - `webhook register` - Register webhook endpoint with Postal
  - `webhook tail` - Monitor webhook events in real-time
  - HMAC signature verification for security
  - Rate limiting and retry logic
  - Daemon mode for background operation

#### Monitoring & Operations
- **Health checks** via `mailgoat health`:
  - Configuration validation
  - Postal API connectivity checks
  - Disk space monitoring
  - System resource checks
  - JSON output for automation/monitoring systems
- **Message inspection** via `mailgoat inspect`:
  - View full message headers
  - Track delivery status and recipients
  - Examine message bodies (plain text and HTML)
  - View attachment metadata
- **Prometheus metrics** via `mailgoat metrics`:
  - HTTP server exposing Prometheus-compatible metrics
  - Send success/failure tracking
  - Performance metrics
  - Health check integration
- **Message deletion** via `mailgoat delete`:
  - Time-based deletion (e.g., "older than 30d")
  - Tag-based deletion
  - Bulk deletion with safety confirmations
  - Dry-run mode for testing

#### Configuration & Security
- Interactive setup with `mailgoat config init`
- **API key management** via `mailgoat keys`:
  - `keys create` - Generate new API keys with scoped permissions
  - `keys list` - View all API keys (values redacted)
  - `keys revoke <id>` - Revoke API keys
  - `keys rotate <id>` - Rotate API keys securely
  - Scope-based access control (send, read, admin)
- Expanded CI/integration coverage for all commands

### Changed

- Postal client payloads now include attachments when provided
- Documentation updated for all new commands and workflows
- CLI version output updated to `1.1.0`
- Enhanced error handling and user feedback across all commands

### Fixed

- CI integration test config alignment (`fromAddress` required in test fixtures/configs)
- Integration helper config serialization now matches runtime config parser expectations (JSON format)

### Breaking Changes

- None

### Contributors

- MailGoat AI Team
- Mariano Pardo
- devops
- mailgoatai
- MailGoat CEO
