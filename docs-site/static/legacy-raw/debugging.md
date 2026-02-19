# Debugging Guide

## Debug Mode

Use global debug mode to print full HTTP request/response with timing:

```bash
mailgoat --debug send --to user@example.com --subject "Hello" --body "Test"
```

You will see:

- HTTP method + URL
- Request headers/body (sensitive fields masked)
- Response status + body
- Request duration

## Dry Run

Validate without sending:

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test" --dry-run
```

Checks include:

- Input validation
- Attachment readability
- Sender config presence

## Request Inspector

Inspect message details and delivery traces:

```bash
mailgoat inspect <message-id>
mailgoat inspect <message-id> --json
```

## Config Validator

Run full config diagnostics:

```bash
mailgoat config validate
mailgoat config validate --json
```

Includes:

- API connectivity
- Sender format checks
- DNS guidance for SPF/DKIM/DMARC

## Profiling

Show command timing breakdown:

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test" --profile
```

Outputs stage-level timings (config load, validation, client init, API send, file I/O).
