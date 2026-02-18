# MailGoat v1.1.0 Release Notes (Draft)

Release date: 2026-02-18
Tag: `v1.1.0`

## Highlights

- Attachments are now supported in `mailgoat send` (`--attach` repeatable).
- Inbox management is now available via webhook-backed local cache.
- Configuration setup is faster with `mailgoat config init`.
- CI stability and integration test reliability were improved.

## What's New

### 1) Attachment Support in Send Command

- `mailgoat send --attach <file>` with multiple attachments supported.
- MIME type detection is automatic.
- File content is base64-encoded for Postal API compatibility.
- Size controls:
  - Warn if attachment exceeds 10MB.
  - Reject if attachment exceeds 25MB.

### 2) Webhook-Based Inbox Management

- New webhook receiver command:
  - `mailgoat inbox serve --host 0.0.0.0 --port 3000 --path /webhooks/postal`
- New inbox commands:
  - `mailgoat inbox list`
  - `mailgoat inbox list --unread`
  - `mailgoat inbox list --since 1h`
  - `mailgoat inbox search "subject:keyword"`
- Messages are cached in local SQLite and marked read after successful `mailgoat read`.

### 3) Config Initialization

- Added interactive setup flow:
  - `mailgoat config init`
- Supports validation and optional connection test before save.

## Validation Summary

- Lint: pass
- Unit tests: pass
- Integration tests: pass
- Packaging check (`npm pack --dry-run`): pass

## Upgrade Notes

- Recommended: update existing CLI installations to `v1.1.0`.
- No breaking changes in this release.

## Announcement Draft

MailGoat `v1.1.0` is live with first-class attachments and webhook-backed inbox workflows.  
You can now send files directly from the CLI and manage incoming mail with local cached listing/search commands.  
This release also improves onboarding (`config init`) and strengthens CI reliability.
