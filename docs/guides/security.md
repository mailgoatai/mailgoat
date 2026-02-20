# Guide: Security

Related docs: [Troubleshooting Advanced](../troubleshooting-advanced.md), [FAQ](../faq.md)

## API Key Management

- Store keys in secret managers or CI secret stores.
- Rotate keys regularly (30-90 days).
- Use separate keys per environment.

## Rotation Playbook

1. Create new Postal API key.
2. Deploy new key to all consumers.
3. Validate with `mailgoat health`.
4. Revoke old key.

## File Permissions

Ensure local state under `~/.mailgoat` is not world-readable.

```bash
chmod -R go-rwx ~/.mailgoat
```

## Network Hardening

- Restrict outbound access to Postal endpoints only.
- Pin TLS behavior via trusted certificate chains.
- Block unused inbound ports; expose only webhook endpoint if needed.

## Logging Hygiene

- Run with sanitized logs (default behavior masks sensitive values).
- Avoid copying debug logs into public tickets without redaction.

## Content Sanitization

Use `--sanitize` or a security policy to sanitize HTML emails before send.

```bash
mailgoat send \
  --to user@example.com \
  --subject "Welcome" \
  --body-html templates/welcome.html \
  --sanitize
```

Config policy in `~/.mailgoat/config.json`:

```json
{
  "security": {
    "sanitization": {
      "html": "strict",
      "templates": "safe",
      "headers": "validate",
      "attachments": "scan"
    },
    "csp": {
      "enabled": true,
      "policy": "default-src 'self'"
    }
  }
}
```

`html` accepts `strict|moderate|off`, and `headers` accepts `validate|sanitize|off`.

## Security Scan

Scan template/HTML files before deployment:

```bash
mailgoat security-scan templates/welcome.html
```

Sample output:

```text
⚠️  Security Issues Found:
- Script tag detected (line 23)
- Inline event handler detected (line 45)

Recommendations:
- Remove <script> tags and SVG scriptable blocks
- Remove inline event handlers (onclick/onerror/etc)
- Replace javascript:/data:text URIs with safe hosted links
```
