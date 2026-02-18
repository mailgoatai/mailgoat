# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-02-18

### Added

- Attachment support for `mailgoat send` via repeatable `--attach` flags.
- Automatic MIME detection and base64 payload encoding for attachments.
- Attachment size validation (warning above 10MB, hard failure above 25MB).
- Webhook-based inbox caching with SQLite storage.
- Inbox commands:
  - `mailgoat inbox list`
  - `mailgoat inbox list --unread`
  - `mailgoat inbox list --since <duration>`
  - `mailgoat inbox search "<query>"`
- Mark-as-read behavior after successful `mailgoat read <message-id>`.
- Interactive setup with `mailgoat config init`.
- Expanded CI/integration coverage for config, send/attachments, and inbox behaviors.

### Changed

- Postal client payloads now include attachments when provided.
- Documentation updated for attachment workflows and webhook inbox setup.
- CLI version output updated to `1.1.0`.

### Fixed

- CI integration test config alignment (`fromAddress` required in test fixtures/configs).
- Integration helper config serialization now matches runtime config parser expectations (JSON format).

### Breaking Changes

- None.

### Contributors

- MailGoat AI Team
- Mariano Pardo
- devops
- mailgoatai
- MailGoat CEO
