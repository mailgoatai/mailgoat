# Troubleshooting Guide

This guide covers the most common MailGoat issues and how to resolve them quickly.

## Problem: Cannot connect to Postal server
**Symptoms:** `No response from Postal server`, `ETIMEDOUT`, or `ECONNREFUSED`.
**Cause:** Server URL is wrong, Postal is down, or network path is blocked.
**Solution:**
1. Verify config values:
```bash
mailgoat config show
```
2. Test DNS/network reachability:
```bash
curl -I https://postal.example.com
nslookup postal.example.com
```
3. Run with API debug logs:
```bash
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

## Problem: SSL/TLS certificate error
**Symptoms:** `certificate has expired`, `self signed certificate`, or TLS handshake failure.
**Cause:** Invalid certificate chain, expired cert, or hostname mismatch.
**Solution:**
1. Validate the certificate:
```bash
openssl s_client -connect postal.example.com:443 -servername postal.example.com
```
2. Renew/fix certificate on Postal host (recommended).
3. Confirm config server hostname matches cert CN/SAN.

## Problem: Network or firewall blocking API requests
**Symptoms:** Requests hang, `Connection refused`, only works from some networks.
**Cause:** Firewall/security group blocks outbound/inbound 443.
**Solution:**
1. Verify outbound access from client host.
2. Ensure Postal server allows inbound 443.
3. Re-test with:
```bash
curl -v https://postal.example.com/api/v1/
```

## Problem: Authentication failed
**Symptoms:** `Unauthorized`, `Forbidden`, or `Invalid API key` errors.
**Cause:** Wrong API key, revoked key, or insufficient permissions.
**Solution:**
1. Rotate/recreate Postal API key.
2. Update config:
```bash
mailgoat config init
```
3. Verify masked key preview:
```bash
mailgoat config show
```

## Problem: Config file not found
**Symptoms:** `Config file not found at ~/.mailgoat/config.json`.
**Cause:** Config not initialized or wrong runtime user/home path.
**Solution:**
1. Initialize config interactively:
```bash
mailgoat config init
```
2. Confirm path:
```bash
mailgoat config path
```
3. Check file ownership/permissions under `~/.mailgoat/`.

## Problem: Config validation failed
**Symptoms:** Validation errors for `server`, `fromAddress`, or `api_key`.
**Cause:** Invalid URL/email format or empty/invalid API key.
**Solution:**
1. Re-run init to correct fields:
```bash
mailgoat config init
```
2. Use full server URL and valid sender email format.
3. Re-check values:
```bash
mailgoat config show
```

## Problem: Email address validation errors
**Symptoms:** `Invalid email format` on `--to`, `--cc`, `--bcc`, or `--from`.
**Cause:** Malformed addresses or unsupported formatting.
**Solution:**
1. Validate addresses use `local@domain.tld` format.
2. Remove spaces and trailing punctuation.
3. Retry with a single recipient first:
```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

## Problem: Failed to send email
**Symptoms:** Generic send failure or Postal API error response.
**Cause:** Missing fields, domain/sender policy, or upstream Postal issue.
**Solution:**
1. Confirm minimum required fields are present.
2. Enable debug and inspect API response:
```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```
3. If sender/domain errors appear, verify allowed sender/domain in Postal UI.

## Problem: Attachment too large
**Symptoms:** `Attachment too large` or total size limit error.
**Cause:** File exceeds per-file/total send limits.
**Solution:**
1. Reduce/compress attachment sizes.
2. Split large sends across multiple emails.
3. Retry with smaller files and monitor warnings:
```bash
mailgoat send --to user@example.com --subject "Files" --body "See attached" --attach ./small.pdf
```

## Problem: Rate limiting or throttling
**Symptoms:** Intermittent failures under high throughput, retry/backoff behavior.
**Cause:** Server-side limits or temporary provider throttling.
**Solution:**
1. Space out sends in automation (batch + delay).
2. Keep retry enabled (default).
3. Re-test with smaller batch volume first.

## Problem: Bounced or rejected email
**Symptoms:** Send appears accepted but recipient never gets mail; Postal indicates bounce/reject.
**Cause:** Invalid recipient, domain reputation, SPF/DKIM/DMARC misconfiguration.
**Solution:**
1. Confirm recipient address is valid.
2. Check domain DNS records (SPF, DKIM, DMARC).
3. Review Postal delivery/bounce details in server dashboard.

## Problem: Node.js version unsupported
**Symptoms:** Install/run errors mentioning engine mismatch.
**Cause:** Node.js version is below required minimum.
**Solution:**
1. Check version:
```bash
node --version
```
2. Upgrade to Node.js 18+.
3. Reinstall dependencies:
```bash
npm install
```

## Problem: npm install fails
**Symptoms:** `npm ERR!` during install.
**Cause:** Network issues, lockfile drift, cache corruption, or registry auth problems.
**Solution:**
1. Retry clean install:
```bash
rm -rf node_modules
npm ci
```
2. If needed, clear npm cache:
```bash
npm cache verify
```
3. Ensure registry/network access is available.

## Problem: Permission errors during install or runtime
**Symptoms:** `EACCES`, cannot write to npm/global or config directories.
**Cause:** Directory ownership/permissions mismatch.
**Solution:**
1. Prefer local installs where possible.
2. Ensure your user owns `~/.mailgoat` and project dir.
3. Re-run config init after fixing permissions:
```bash
mailgoat config init
```

## Collecting diagnostic output
Use debug mode before opening an issue:

```bash
DEBUG=mailgoat:* mailgoat send --to user@example.com --subject "Debug" --body "Test"
```

Include:
- Command used (without secrets)
- Full error message
- Relevant debug output (redacted)
- `node --version` and `npm --version`
