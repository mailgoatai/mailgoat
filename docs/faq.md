# MailGoat FAQ

Related docs: [API Reference](./api-reference.md), [Troubleshooting Advanced](./troubleshooting-advanced.md), [Guides](./guides/)

## Setup

1. **How do I initialize MailGoat?**
Run `mailgoat config init` and follow prompts.

2. **Where is config stored?**
At `~/.mailgoat/config.json`.

3. **Can I skip connectivity test during init?**
Yes, use `mailgoat config init --skip-test`.

4. **How do I view current config?**
Use `mailgoat config show` or `mailgoat config show --json`.

5. **How do I find config path quickly?**
Run `mailgoat config path`.

6. **Can environment variables override config?**
Yes, common vars include `MAILGOAT_SERVER`, `MAILGOAT_API_KEY`, `MAILGOAT_EMAIL`.

## Sending

7. **What’s the minimum send command?**
`mailgoat send --to user@example.com --subject "x" --body "x"`.

8. **How do I send HTML?**
Use `--html` with `--body` content.

9. **How do I add attachments?**
Repeat `--attach` for each file.

10. **What attachment size limits exist?**
Warn >10MB, hard fail >25MB.

11. **Can I disable retries?**
Yes, pass `--no-retry`.

12. **How do I tag outbound messages?**
Use `--tag your-tag`.

13. **How do I send with templates?**
Use `--template <name|file>` with optional `--var`/`--data`.

14. **Can I template subject and body inline?**
Yes, `--subject` and `--body` support Handlebars variables.

15. **What helpers are built in?**
`uppercase`, `lowercase`, `date`.

16. **Why does templating fail for missing variables?**
Rendering is strict by design to avoid silent bad emails.

## Receiving / Inbox

17. **How do I receive emails with MailGoat?**
Run `mailgoat inbox serve` and configure Postal webhook.

18. **Where are inbox messages stored?**
SQLite DB at `~/.mailgoat/inbox/messages.db`.

19. **How do I list unread messages?**
`mailgoat inbox list --unread`.

20. **How do I filter by time?**
`mailgoat inbox list --since 1h`.

21. **How do I search inbox quickly?**
`mailgoat inbox search "subject:invoice"`.

22. **Are messages marked read automatically?**
Yes, when successfully read via `mailgoat read` in cache-backed flow.

## Self-Hosting

23. **Does MailGoat include a mail server?**
No. MailGoat is a CLI/client over Postal.

24. **Do I need open inbound SMTP on port 25?**
For full self-hosted inbound delivery, generally yes (or relay workaround).

25. **What DNS records are required?**
SPF, DKIM, and DMARC are strongly recommended.

26. **Can I run webhook receiver behind reverse proxy?**
Yes; preserve path and ensure POST body forwarding.

## Troubleshooting

27. **What does exit code 2 mean?**
For `health`, it indicates warnings without hard failures.

28. **How do I debug failures?**
Use `--debug` or `DEBUG=mailgoat:*`.

29. **Why do I get auth errors after rotating keys?**
One service likely still uses stale key; update all consumers.

30. **How do I reduce rate-limit errors?**
Lower burst concurrency, use retries, and spread sends over time.

31. **Can I use JSON output in scripts?**
Yes; pass `--json` and parse stdout.

32. **Where should I start when everything fails?**
Run `mailgoat health --verbose` first, then command-specific debug runs.
