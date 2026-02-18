# MailGoat API Reference

Comprehensive CLI reference for `mailgoat`.

Related docs:
- [Architecture](./architecture.md)
- [Advanced Troubleshooting](./troubleshooting-advanced.md)
- [FAQ](./faq.md)
- [Guides: Templates](./guides/templates.md)

## Global Usage

```bash
mailgoat [global-options] <command> [subcommand] [options]
```

Global options:
- `--debug`: Enable verbose debug logs (equivalent to `DEBUG=mailgoat:*`).
- `--silent`: Suppress non-essential output.
- `-V, --version`: Print CLI version.
- `-h, --help`: Show help.

## Environment Variables

Core:
- `DEBUG`: Debug namespaces (`mailgoat:*`, `mailgoat:api`, `mailgoat:config`, `mailgoat:timing`, `mailgoat:validation`).
- `MAILGOAT_LOG_LEVEL` / `LOG_LEVEL`: Logger level (`error`, `warn`, `info`, `debug`).
- `MAILGOAT_LOG_CONSOLE` / `LOG_CONSOLE`: Enable console logging (`true`/`false`).
- `NODE_ENV`: Standard Node.js environment behavior.

Config overrides (used by config service and docs/examples):
- `MAILGOAT_SERVER`
- `MAILGOAT_EMAIL`
- `MAILGOAT_API_KEY`
- `MAILGOAT_PROFILE`

## Exit Codes

Default command behavior:
- `0`: Success.
- `1`: Validation, command, config, or API error.

Health command special behavior:
- `0`: All checks passed.
- `1`: At least one health check failed.
- `2`: No failures, but one or more warnings.

## Command: `send`

### Usage

```bash
mailgoat send [options]
```

### Flags

- `-t, --to <emails...>`: Recipients.
- `-s, --subject <text>`: Subject (required unless supplied by template).
- `-b, --body <text>`: Plain body (required unless template or html body is used).
- `-f, --from <email>`: Override sender.
- `--cc <emails...>`: CC recipients.
- `--bcc <emails...>`: BCC recipients.
- `--html`: Treat `--body` as HTML.
- `--tag <tag>`: Message tag.
- `--attach <file>`: Attachment path (repeatable).
- `--template <name|file>`: Saved template name or direct template file path.
- `--var <key=value...>`: Inline template vars (repeatable).
- `--data <file>`: JSON file for template vars.
- `--no-retry`: Disable retry behavior.
- `--json`: JSON output.

### Examples

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test"
mailgoat send --to user@example.com --subject "Report" --body "See attached" --attach report.pdf --attach chart.png
mailgoat send --to user@example.com --subject "Hi {{uppercase name}}" --body "{{date}}" --data vars.json
mailgoat send --to user@example.com --subject "Invoice" --template invoice.txt --data data.json
```

### Notes

- Attachments warn above 10MB and fail above 25MB.
- Template rendering is strict; missing variables fail fast.

## Command: `read`

### Usage

```bash
mailgoat read <message-id> [options]
```

### Flags

- `--json`: JSON output.
- `--full`: Include full expansions.
- `--no-retry`: Disable retries.

### Examples

```bash
mailgoat read abc123
mailgoat read abc123 --full --json
```

### Notes

- In webhook-backed inbox mode, successful reads mark messages as read in local cache.

## Command: `inbox`

`inbox` provides local-cache inbox operations and webhook server functionality.

### Subcommand: `list`

```bash
mailgoat inbox list [options]
```

Flags:
- `--unread`
- `--since <time>`
- `-l, --limit <n>` (default `50`)
- `--db-path <path>`
- `--json`

Example:

```bash
mailgoat inbox list --unread --since 1h --limit 25
```

### Subcommand: `search`

```bash
mailgoat inbox search "<query>" [options]
```

Flags:
- `-l, --limit <n>`
- `--db-path <path>`
- `--json`

Example:

```bash
mailgoat inbox search "subject:invoice" --limit 20
```

### Subcommand: `serve`

```bash
mailgoat inbox serve [options]
```

Flags:
- `--host <host>` (default `127.0.0.1`)
- `--port <port>` (default `3000`)
- `--path <path>` (default `/webhooks/postal`)
- `--db-path <path>`

Example:

```bash
mailgoat inbox serve --host 0.0.0.0 --port 3000 --path /webhooks/postal
```

## Command: `search`

### Usage

```bash
mailgoat search [options]
```

### Flags

- `--from <email>`
- `--to <email>`
- `--subject <text>`
- `--body <text>`
- `--after <date>`
- `--before <date>`
- `--tag <tag>`
- `--has-attachment`
- `--limit <number>` (default `25`)
- `--sort <field>`: `date|from|to|subject`
- `--order <direction>`: `asc|desc`
- `--cache-path <path>`
- `--json`

### Examples

```bash
mailgoat search --from alerts@example.com --after 7d --sort date --order desc
mailgoat search --subject "incident" --has-attachment --json
```

## Command: `delete`

### Usage

```bash
mailgoat delete <message-id> [options]
```

### Flags

- `--older-than <duration>`
- `--from <email>`
- `--to <email>`
- `--tag <tag>`
- `--subject <text>`
- `--dry-run`
- `-y, --yes`
- `--limit <number>` (default `100`)
- `--json`

### Examples

```bash
mailgoat delete abc123
mailgoat delete --older-than 30d --from noreply@example.com --dry-run
mailgoat delete --tag temp --yes --limit 50
```

### Notes

- Use `--dry-run` before any broad delete filter.

## Command: `config`

### Usage

```bash
mailgoat config <subcommand> [options]
```

### Subcommand: `init`

```bash
mailgoat config init [--force] [--skip-test]
```

### Subcommand: `show`

```bash
mailgoat config show [--json]
```

### Subcommand: `path`

```bash
mailgoat config path
```

### Examples

```bash
mailgoat config init
mailgoat config show --json
mailgoat config path
```

## Command: `template`

### Usage

```bash
mailgoat template <subcommand> [options]
```

### Subcommand: `create`

```bash
mailgoat template create <name> -s "Subject" [options]
```

Flags:
- `-b, --body <text>`
- `--html <text>`
- `--body-file <path>`
- `--html-file <path>`
- `-f, --from <email>`
- `--cc <emails...>`
- `--bcc <emails...>`
- `--tag <tag>`
- `--description <text>`
- `--json`

### Subcommand: `list`

```bash
mailgoat template list [--json]
```

### Subcommand: `show`

```bash
mailgoat template show <name> [--json]
```

### Subcommand: `edit`

```bash
mailgoat template edit <name> [options]
```

(Uses same editable fields as `create`, except `name`.)

### Subcommand: `delete`

```bash
mailgoat template delete <name> [-y] [--json]
```

### Examples

```bash
mailgoat template create weekly -s "Weekly {{date}}" -b "Hello {{name}}"
mailgoat template list
mailgoat send --template weekly --to user@example.com --var name=Alice
```

## Command: `health`

### Usage

```bash
mailgoat health [options]
```

### Flags

- `-v, --verbose`: Show progress and details.
- `--json`: JSON output.
- `--send-test`: Send a test email to configured sender.

### Examples

```bash
mailgoat health
mailgoat health --verbose
mailgoat health --send-test --json
```

### Notes

- Health checks include config validation, connectivity, auth, and file-system checks.
