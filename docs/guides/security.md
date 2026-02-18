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
