# Troubleshooting Guide

This guide covers common MailGoat problems and practical fixes.

## Quick Diagnostics

Run these first to narrow down most issues:

```bash
node --version
npm --version
mailgoat --version
mailgoat config show
```

For verbose logs:

```bash
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Debug" --body "Test"
```

Related docs:
- [Debugging](./debugging.md)
- [API Reference](./api-reference.md)
- [Postal Account Setup](./postal-account-setup-guide.md)
- [Webhook Guide](./WEBHOOK.md)
- [Admin Panel](./admin-panel.md)

## 1) Installation Issues

### Issue 1: `npm install` fails
- Symptom: `npm ERR!` during install (dependency resolution or network errors).
- Cause: Corrupt cache, lockfile drift, registry/network issues.
- Solution:
  1. Clean install dependencies.
  2. Retry with force if needed.
  3. Verify npm registry access.
```bash
rm -rf node_modules
npm cache verify
npm install
npm install --force
```
- Prevention tip: Prefer `npm ci` in CI and keep `package-lock.json` committed.

### Issue 2: Permission errors (`EACCES`) during global install
- Symptom: `EACCES: permission denied` when installing globally.
- Cause: Global npm directory owned by another user/root.
- Solution:
  1. Configure a user-owned npm prefix.
  2. Re-open shell and reinstall.
```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
npm install -g mailgoat
```
- Prevention tip: Avoid `sudo npm install -g ...` for day-to-day usage.

### Issue 3: Node version too old
- Symptom: Engine mismatch or syntax/runtime errors on startup.
- Cause: Node.js < 18.
- Solution:
  1. Check current version.
  2. Upgrade to Node.js 18+.
```bash
node --version
```
- Prevention tip: Pin Node version in your dev environment (nvm/asdf/volta).

## 2) Connection Issues

### Issue 4: `No response from Postal server`
- Symptom: Request hangs or fails with no API response.
- Cause: Bad API key, wrong host, Postal unavailable.
- Solution:
  1. Verify MailGoat config.
  2. Verify server reachable via curl.
  3. Retry with debug logs.
```bash
mailgoat config show
curl -I https://postal.example.com
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Ping" --body "Test"
```
- Prevention tip: Add health checks for Postal and key rotation process.

### Issue 5: Timeout errors (`ETIMEDOUT`)
- Symptom: `ETIMEDOUT` / `connect timeout`.
- Cause: Wrong Postal URL, DNS issue, firewall/routing problems.
- Solution:
  1. Confirm URL in config.
  2. Confirm DNS resolution.
  3. Check network path/firewall.
```bash
mailgoat config show
nslookup postal.example.com
curl -v https://postal.example.com/api/v1/
```
- Prevention tip: Use stable DNS and monitor latency from agent hosts.

### Issue 6: SSL/TLS errors
- Symptom: `self signed certificate`, `certificate has expired`, TLS handshake failure.
- Cause: Invalid certificate chain, expired cert, host mismatch.
- Solution:
  1. Inspect certificate details.
  2. Fix/renew cert on Postal server.
  3. Ensure configured hostname matches cert SAN/CN.
```bash
openssl s_client -connect postal.example.com:443 -servername postal.example.com
```
- Prevention tip: Automate certificate renewal and expiry alerts.

## 3) Configuration Issues

### Issue 7: Config not found
- Symptom: `Config file not found`.
- Cause: Config not initialized in current user context.
- Solution:
  1. Initialize config.
  2. Verify config path.
```bash
mailgoat config init
mailgoat config path
```
- Prevention tip: Bootstrap config in setup scripts for each environment.

### Issue 8: Invalid API key
- Symptom: `Unauthorized`, `Invalid API key`, HTTP 401.
- Cause: Wrong/revoked key or using wrong server/key pair.
- Solution:
  1. Regenerate key in Postal.
  2. Update MailGoat config.
  3. Re-test with a simple send.
```bash
mailgoat config init
mailgoat send --to user@example.com --subject "Auth Test" --body "Test"
```
- Prevention tip: Store keys in a secret manager, not ad-hoc shell history.

### Issue 9: Wrong sender email / route mismatch
- Symptom: sender rejected, route or from-address errors.
- Cause: From address not authorized or route missing.
- Solution:
  1. Verify route/domain exists in Postal.
  2. Use valid sender address configured for that route.
  3. Retry with explicit sender.
```bash
mailgoat send --to user@example.com --from agent@mailgoat.ai --subject "Route Test" --body "Test"
```
- Prevention tip: Keep a documented list of approved sender addresses.

## 4) Admin Panel Issues

### Issue 10: Cannot login to admin panel
- Symptom: Login rejected even with expected password.
- Cause: `ADMIN_PASSWORD` env var missing/incorrect.
- Solution:
  1. Set `ADMIN_PASSWORD` in runtime env.
  2. Restart admin panel process.
  3. Retry login.
```bash
export ADMIN_PASSWORD='change-me'
```
- Prevention tip: Manage admin credentials in env files/secrets with rotation policy.

### Issue 11: Admin dashboard is empty
- Symptom: UI loads but cards/tables show no data.
- Cause: DB connection misconfigured or Postal DB unreachable.
- Solution:
  1. Verify DB URL and credentials.
  2. Confirm connectivity to Postal DB.
  3. Check admin API logs for query failures.
```bash
# Example environment variable
export POSTAL_DB_URL='mysql://user:pass@host:3306/postal-server-4'
```
- Prevention tip: Add startup DB-check alerts and dashboard smoke tests.

### Issue 12: Stats not updating
- Symptom: Values stale despite new traffic.
- Cause: Admin API cannot read latest Postal tables or polling issue.
- Solution:
  1. Verify admin API has access to `messages` and related tables.
  2. Check server logs for SQL/query errors.
  3. Verify timezone/time-window assumptions in dashboard.
- Prevention tip: Track API freshness with a “last refreshed” timestamp and alert.

## 5) Command-Specific Issues

### Issue 13: `mailgoat send` fails with recipient errors
- Symptom: `Invalid email format`, `No recipients specified`.
- Cause: malformed `--to`, missing recipients, separator issues.
- Solution:
  1. Pass valid recipient format.
  2. Test with one known-good recipient first.
```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
```
- Prevention tip: Validate recipient list before invoking CLI in automation.

### Issue 14: Inbox appears empty
- Symptom: `mailgoat inbox list` returns no messages.
- Cause: Webhook receiver not running or not configured in Postal.
- Solution:
  1. Start webhook receiver.
  2. Configure Postal webhook endpoint.
  3. Send a test email and re-check inbox.
```bash
mailgoat inbox serve --host 127.0.0.1 --port 3000 --path /webhooks/postal
mailgoat inbox list --limit 50
```
- Prevention tip: Add heartbeat checks for webhook endpoint health.

### Issue 15: Template not found
- Symptom: `Template not found` or render command fails.
- Cause: wrong template name/path or missing template file.
- Solution:
  1. List available templates.
  2. Use exact template name.
  3. Validate template variables.
```bash
mailgoat template list
mailgoat template show <name>
```
- Prevention tip: Use naming conventions and CI checks for template assets.

### Issue 16: Delete/read command fails for message ID
- Symptom: `MessageNotFound`, invalid message id format, 404 on read/delete.
- Cause: wrong ID, already deleted message, wrong environment.
- Solution:
  1. Copy ID directly from inbox/list output.
  2. Confirm message exists before delete.
  3. Retry in correct profile/environment.
```bash
mailgoat inbox list --limit 20 --json
mailgoat read <message-id>
mailgoat delete <message-id>
```
- Prevention tip: Build idempotent automation (treat missing message as already processed).

## Escalation Checklist

If issue persists, collect and share:

1. Command executed (redact secrets).
2. Full error output.
3. Debug logs (`DEBUG=mailgoat:*`).
4. Runtime versions (`node`, `npm`, `mailgoat`).
5. Relevant config context (`mailgoat config show`, redacted).
