# MailGoat Troubleshooting Guide

Format used in each entry: **Problem -> Symptom -> Cause -> Fix**.

## 1) Installation

### 1.1 Problem: MailGoat command is not found

- Symptom:
  - `"zsh: command not found: mailgoat"`
  - `"bash: mailgoat: command not found"`
- Cause:
  - CLI not installed globally, or npm global bin path is not in `PATH`.
- Fix:
  1. Install MailGoat globally.
  2. Check npm global bin path.
  3. Add that path to your shell profile and reload shell.
  4. Re-run the command.

```bash
npm install -g mailgoat
npm bin -g
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc
source ~/.zshrc
mailgoat --version
```

- Verify:

```bash
mailgoat --help
```

- Related docs: [CLI Quick Start](./CLI_QUICK_START.md), [README](../README.md)

### 1.2 Problem: Global npm install fails with permissions

- Symptom:
  - `"npm ERR! code EACCES"`
- Cause:
  - npm global prefix points to a root-owned directory.
- Fix:
  1. Set a user-owned npm prefix.
  2. Add it to your `PATH`.
  3. Reinstall globally.

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
npm install -g mailgoat
```

- Verify:

```bash
mailgoat --version
```

- Related docs: [CLI Quick Start](./CLI_QUICK_START.md)

## 2) Connection

### 2.1 Problem: Cannot reach Postal server

- Symptom:
  - `"Could not connect to Postal server at <server>. Check your network connection and server URL."`
- Cause:
  - DNS/network failure, wrong server URL, or server down.
- Fix:
  1. Check current configured server.
  2. Validate DNS and network reachability.
  3. Re-run with debug logs.

```bash
mailgoat config show
curl -I https://postal.example.com
DEBUG=mailgoat:* mailgoat health
```

- Verify:

```bash
mailgoat health
```

- Related docs: [HEALTH](./HEALTH.md), [postal-account-setup-guide](./postal-account-setup-guide.md)

### 2.2 Problem: Server timeout

- Symptom:
  - `"Connection to Postal server timed out. The server may be overloaded or your network is slow."`
- Cause:
  - Slow network, firewall, overloaded Postal service, wrong URL.
- Fix:
  1. Confirm server URL is correct.
  2. Check network path (VPN/firewall/proxy).
  3. Retry and inspect timing/debug logs.

```bash
mailgoat config get server
curl -v https://postal.example.com/api/v1/
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "Timeout test" --body "ping"
```

- Verify:

```bash
mailgoat health --json
```

- Related docs: [DEBUG-EXAMPLES](./DEBUG-EXAMPLES.md), [HEALTH](./HEALTH.md)

### 2.3 Problem: No response from server

- Symptom:
  - `"No response from Postal server. Check your network connection and server URL."`
- Cause:
  - Request did not receive any HTTP response (routing, SSL, proxy, server issue).
- Fix:
  1. Confirm URL and TLS endpoint.
  2. Check if reverse proxy/load balancer is healthy.
  3. Retry with debug logs.

```bash
mailgoat config show
curl -vk https://postal.example.com
DEBUG=mailgoat:* mailgoat health
```

- Verify:

```bash
mailgoat health
```

- Related docs: [debugging](./debugging.md), [self-hosting-guide](./self-hosting-guide.md)

## 3) Authentication

### 3.1 Problem: API key rejected (401/403)

- Symptom:
  - `"Authentication failed. Your API key is invalid or expired."`
  - `"Run: mailgoat config init"`
- Cause:
  - Wrong/revoked/expired API key, or key from another server.
- Fix:
  1. Generate a fresh Postal server credential.
  2. Re-run config init and paste new key.
  3. Test with health.

```bash
mailgoat config init
mailgoat health
```

- Verify:

```bash
mailgoat health --json
```

- Related docs: [postal-account-setup-guide](./postal-account-setup-guide.md), [HEALTH](./HEALTH.md)

### 3.2 Problem: From address not authorized

- Symptom:
  - `"Sender email \"<address>\" is not authorized."`
  - `"You can only send from domains configured in your Postal server."`
- Cause:
  - `fromAddress` domain not configured in Postal.
- Fix:
  1. Configure/verify domain in Postal.
  2. Set a valid sender in config.
  3. Send test email.

```bash
mailgoat config set fromAddress agent@yourdomain.com
mailgoat send --to user@example.com --subject "Auth test" --body "ok"
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Verify" --body "ok"
```

- Related docs: [dns-configuration-guide](./dns-configuration-guide.md), [postal-account-setup-guide](./postal-account-setup-guide.md)

## 4) Sending

### 4.1 Problem: No recipients provided

- Symptom:
  - `"No recipients specified. Add --to, --cc, or --bcc."`
- Cause:
  - Missing recipient flags.
- Fix:
  1. Provide at least one recipient.
  2. Re-run send command.

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test"
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Verify" --body "ok"
```

- Related docs: [api-reference](./api-reference.md), [CLI Quick Start](./CLI_QUICK_START.md)

### 4.2 Problem: Empty email body/content

- Symptom:
  - `"Email has no content. Add --body or --html."`
- Cause:
  - Neither plain text nor HTML body provided.
- Fix:
  1. Add `--body` or `--html`.
  2. Retry send.

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test body"
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Verify" --html --body "<p>ok</p>"
```

- Related docs: [api-reference](./api-reference.md)

### 4.3 Problem: Invalid recipient format

- Symptom:
  - `"Invalid email address: \"not-an-email\""`
- Cause:
  - Recipient value is not a valid email address.
- Fix:
  1. Correct recipient format.
  2. Validate input source if automated.

```bash
mailgoat send --to user@example.com --subject "Hello" --body "Test"
```

- Verify:

```bash
mailgoat send --to valid@example.com --subject "Verify" --body "ok"
```

- Related docs: [DEBUG-EXAMPLES](./DEBUG-EXAMPLES.md), [api-reference](./api-reference.md)

### 4.4 Problem: Attachment file missing

- Symptom:
  - `"Attachment file not found: <path>"`
- Cause:
  - Wrong file path or missing file.
- Fix:
  1. Confirm file exists.
  2. Use absolute/working directory-safe path.
  3. Retry.

```bash
ls -lah ./report.pdf
mailgoat send --to user@example.com --subject "Report" --body "Attached" --attach ./report.pdf
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Attachment verify" --body "ok" --attach ./report.pdf
```

- Related docs: [api-reference](./api-reference.md)

### 4.5 Problem: Attachment exceeds size limit

- Symptom:
  - `"Attachment too large: <file> (<size>MB). Maximum is 25MB per file."`
- Cause:
  - Attachment larger than MailGoat file limit.
- Fix:
  1. Compress or split file.
  2. Use link-based delivery for large files.
  3. Retry with smaller attachment.

```bash
ls -lh ./large-file.zip
mailgoat send --to user@example.com --subject "Large file" --body "Use download link: https://..."
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Verify small attachment" --body "ok" --attach ./small-file.pdf
```

- Related docs: [api-reference](./api-reference.md)

## 5) Config

### 5.1 Problem: Config file missing

- Symptom:
  - `"Config file not found at ~/.mailgoat/config.json"`
  - Health may show `"Config file not found"`
- Cause:
  - Config never initialized or wrong HOME/user context.
- Fix:
  1. Run interactive config setup.
  2. Confirm path in current shell user context.

```bash
mailgoat config init
mailgoat config path
```

- Verify:

```bash
mailgoat config show
```

- Related docs: [CLI Quick Start](./CLI_QUICK_START.md), [HEALTH](./HEALTH.md)

### 5.2 Problem: Config validation failed

- Symptom:
  - `"Configuration validation failed: ..."`
  - or `"Config file missing required fields"`
- Cause:
  - Missing/invalid `server`, `fromAddress`, or `api_key`.
- Fix:
  1. Update required keys.
  2. Validate config and retry.

```bash
mailgoat config set server https://postal.example.com
mailgoat config set fromAddress agent@example.com
mailgoat config set api_key your-key
mailgoat config validate
```

- Verify:

```bash
mailgoat config validate --json
```

- Related docs: [HEALTH](./HEALTH.md), [api-reference](./api-reference.md)

### 5.3 Problem: Config init cancelled/fails

- Symptom:
  - `"Configuration init cancelled"`
  - `"Configuration cancelled"`
- Cause:
  - User cancelled prompts, test failed and save was declined, or invalid prompt values.
- Fix:
  1. Re-run init with valid values.
  2. If network is temporarily blocked, use `--skip-test`.

```bash
mailgoat config init --skip-test
mailgoat config show
```

- Verify:

```bash
mailgoat health
```

- Related docs: [CLI Quick Start](./CLI_QUICK_START.md)

## 6) Admin Panel

### 6.1 Problem: Admin panel server won’t start

- Symptom:
  - `"Error: Admin password not set. Use --password or ADMIN_PASSWORD env var"`
  - `"Error: admin password must be at least 12 characters long."`
  - `"Error: SESSION_SECRET not set. Use --session-secret or SESSION_SECRET env var"`
  - `"Error: SESSION_SECRET must be at least 32 characters."`
- Cause:
  - Missing/weak security env vars.
- Fix:
  1. Set strong values.
  2. Restart admin server.

```bash
export ADMIN_PASSWORD='change-this-to-a-strong-password'
export SESSION_SECRET='change-this-to-a-very-long-random-secret-value-32+'
mailgoat admin serve --host 127.0.0.1 --port 3001
```

- Verify:

```bash
curl -i http://127.0.0.1:3001/admin
```

- Related docs: [admin-panel](./admin-panel.md)

### 6.2 Problem: Admin pages don’t load

- Symptom:
  - `"Error: admin-ui/dist not found. Run \`npm run admin:ui:build\` first."`
- Cause:
  - Frontend bundle not built.
- Fix:
  1. Install UI dependencies.
  2. Build admin UI.
  3. Restart admin server.

```bash
npm run admin:ui:install
npm run admin:ui:build
mailgoat admin serve --host 127.0.0.1 --port 3001
```

- Verify:

```bash
curl -i http://127.0.0.1:3001/admin
```

- Related docs: [admin-panel](./admin-panel.md)

### 6.3 Problem: Admin login fails

- Symptom:
  - API returns `{"code":"INVALID_CREDENTIALS","message":"Invalid credentials"}`
  - API returns `{"code":"UNAUTHORIZED","message":"Login required"}` when not logged in
- Cause:
  - Wrong password or expired/missing session cookie.
- Fix:
  1. Re-enter password.
  2. Clear cookies / open private window.
  3. Confirm server process uses expected `ADMIN_PASSWORD`.

```bash
# check process env source / restart server with explicit env
mailgoat admin serve --password 'your-password' --session-secret 'your-32-char-secret................................'
```

- Verify:

```bash
curl -i http://127.0.0.1:3001/api/admin/status
```

- Related docs: [admin-panel](./admin-panel.md)

## 7) Performance

### 7.1 Problem: Slow sending / retries frequently

- Symptom:
  - repeated retry logs like `"retrying (1/3)..."`
  - `"Rate limit exceeded. Too many requests to Postal server."`
- Cause:
  - Server throttling or transient network errors.
- Fix:
  1. Reduce send concurrency/rate.
  2. Retry with backoff (default is enabled).
  3. Inspect health and server load.

```bash
mailgoat health --json
mailgoat send-batch --file recipients.json --concurrency 5
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Perf verify" --body "ok"
```

- Related docs: [HEALTH](./HEALTH.md), [guides/error-handling](./guides/error-handling.md)

### 7.2 Problem: Timeout under load

- Symptom:
  - `"Connection to Postal server timed out..."`
- Cause:
  - Network saturation or overloaded Postal instance.
- Fix:
  1. Run health check and inspect server metrics.
  2. Send in smaller batches.
  3. Improve Postal capacity or route/network.

```bash
mailgoat health
mailgoat send-batch --file recipients.json --concurrency 2
```

- Verify:

```bash
mailgoat send --to user@example.com --subject "Timeout verify" --body "ok"
```

- Related docs: [HEALTH](./HEALTH.md), [monitoring](./monitoring.md)

## 8) Docker

### 8.1 Problem: Docker Compose won’t start

- Symptom:
  - `"Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"`
- Cause:
  - Docker daemon is not running or current user lacks permission.
- Fix:
  1. Start Docker Desktop / Docker daemon.
  2. Ensure your user can access Docker.
  3. Re-run compose.

```bash
docker info
docker compose up -d
```

- Verify:

```bash
docker compose ps
```

- Related docs: [local-development](./local-development.md), [self-hosting-guide](./self-hosting-guide.md)

### 8.2 Problem: Port conflicts

- Symptom:
  - `"Error response from daemon: Ports are not available"`
  - or `"bind: address already in use"`
- Cause:
  - Another process is already listening on mapped ports (e.g. `5000`, `25`, `3001`).
- Fix:
  1. Find process using the port.
  2. Stop conflicting service or remap ports in compose.
  3. Restart compose.

```bash
lsof -i :5000
lsof -i :25
# then edit docker-compose.yml ports and restart
docker compose up -d
```

- Verify:

```bash
docker compose ps
curl -I http://localhost:5000
```

- Related docs: [local-development](./local-development.md), [self-hosting-guide](./self-hosting-guide.md)

---

## Quick Escalation Checklist

If an issue still fails after fixes, collect:

1. Exact command run.
2. Full error output (redact secrets).
3. `mailgoat --version`, `node --version`, `npm --version`.
4. `mailgoat config show` (redacted API key).
5. Debug output:

```bash
DEBUG=mailgoat:* mailgoat health
```
