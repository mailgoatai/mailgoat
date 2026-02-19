# API Key Security Guide

This guide covers secure API key lifecycle management with `mailgoat keys`.

## Key Principles

- Use separate keys per environment (`prod`, `staging`, `dev`, CI).
- Grant minimal scopes whenever possible (`send`, `read`, `admin`).
- Rotate keys regularly and after incidents.
- Never commit keys to source control.

## Commands

```bash
mailgoat keys create --name "production-app" --scopes send,read
mailgoat keys list
mailgoat keys rotate <key-id>
mailgoat keys revoke <key-id>
mailgoat keys audit --limit 50
```

## Storage Model

- Metadata file: `~/.mailgoat/api-keys.json`
- Audit log: `~/.mailgoat/audit.log`
- Secret values:
  - Preferred: system keychain (if `keytar` available)
  - Fallback: AES-256-GCM encrypted values with password (`MAILGOAT_KEYS_PASSWORD` or prompt)

## GitHub Actions Best Practices

1. Store API keys in repository or environment secrets (`MAILGOAT_API_KEY`).
2. Never print secrets in logs.
3. Use environment-specific secrets (`prod`, `staging`).
4. Rotate keys on a fixed cadence (for example every 30-90 days).

Example:

```yaml
env:
  MAILGOAT_SERVER: ${{ secrets.MAILGOAT_SERVER }}
  MAILGOAT_API_KEY: ${{ secrets.MAILGOAT_API_KEY }}
```

## Zero-Downtime Rotation

1. Create a new key.
2. Deploy services with the new key.
3. Verify traffic and health checks.
4. Revoke the old key.
5. Confirm no clients still use old credentials.

## Emergency Revocation

If a key leaks:

1. Revoke immediately: `mailgoat keys revoke <key-id>`
2. Create replacement key.
3. Roll replacement to all dependent systems.
4. Review `mailgoat keys audit` for suspicious usage.
5. Document incident and harden secret handling.
