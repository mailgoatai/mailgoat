# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-15

### Added
- Initial release of MailGoat GitHub Action
- Send emails via Postal API from GitHub workflows
- Support for plain text and HTML emails
- Multiple recipient support (to, cc, bcc)
- Reply-to header support
- GitHub context variable expansion
- Configurable error handling (fail_on_error)
- Action outputs (message_id, success, error)
- Job summaries with email details
- Comprehensive error messages
- Full documentation and examples

### Features
- Direct Postal API integration (no CLI dependency)
- Validates email address formats
- 30-second timeout for API calls
- Detailed logging with @actions/core
- TypeScript implementation with strict types
- Zero dependencies in action runtime (compiled with ncc)

### Example Workflows
- Deploy notifications
- PR review requests
- Failure alerts
- Multi-recipient notifications

## [Unreleased]

### Planned
- Attachment support
- Template system for common email types
- Retry logic with exponential backoff
- Rate limiting handling
- Email preview in pull requests
- Message threading support
