# Troubleshooting Advanced Encyclopedia

Related docs: [Debug docs](./DEBUG.md), [API Reference](./api-reference.md), [Security Guide](./guides/security.md)

Use this flow first:
1. `mailgoat health --verbose`
2. Re-run failing command with `--debug` and optionally `--json`
3. Isolate whether issue is config, network, Postal API, or local storage

## Scenarios (20+)

1. **`Config file not found`**
Solution: Run `mailgoat config init` or verify path with `mailgoat config path`.

2. **`Invalid email format`**
Solution: Validate recipient/sender formatting and remove trailing punctuation.

3. **`Subject is required`**
Solution: Provide `--subject` or template subject.

4. **`Email body is required`**
Solution: Provide `--body`, `--html`, or template body/html.

5. **Template render failure (missing var)**
Solution: Provide missing key via `--var` or `--data`; check typo/case.

6. **`Failed to load template data file`**
Solution: Ensure file exists and contains a JSON object.

7. **Attachment >25MB rejected**
Solution: Compress/split file or host externally and include URL.

8. **Attachment MIME mis-detected**
Solution: Verify file content and extension; regenerate corrupted files.

9. **DNS `ENOTFOUND`**
Solution: Check Postal hostname, DNS resolver, and outbound DNS policy.

10. **`ECONNREFUSED`**
Solution: Verify Postal service is running and reachable on expected port.

11. **`ETIMEDOUT`**
Solution: Check firewall/VPN/proxy and increase reliability of network path.

12. **Authentication failed**
Solution: Rotate/reload API key and verify server/key pair in config.

13. **Rate limit responses**
Solution: Reduce concurrency, add jitter, and keep retries enabled.

14. **From address unauthorized**
Solution: Use verified sender domain/address configured in Postal.

15. **Webhook server receives no events**
Solution: Confirm public endpoint reachability and webhook URL path.

16. **SQLite database locked**
Solution: Avoid multiple writers sharing same DB path; isolate per process.

17. **`permission denied` in `~/.mailgoat`**
Solution: Fix ownership and mode: `chmod -R go-rwx ~/.mailgoat`.

18. **`mailgoat inbox list` returns empty**
Solution: Ensure webhook mode is active and events are being ingested.

19. **Delete command removes too much**
Solution: Always test filter with `--dry-run` before applying with `--yes`.

20. **CI pipeline fails but local pass**
Solution: Run exact CI command set, clean install, and pin Node version.

21. **Port 25 blocked in self-hosting**
Solution: Use relay/SMTP provider or request cloud provider unblocking.

22. **Poor inbox deliverability/IP reputation**
Solution: Verify SPF/DKIM/DMARC, warm up IP, and monitor bounce/complaint rates.

23. **Debug logs too noisy**
Solution: Use namespace debug (for example `DEBUG=mailgoat:api`).

24. **Command exits with code 1 and generic message**
Solution: Re-run with `--debug` and capture stderr.

25. **Health command returns warning exit code 2**
Solution: Inspect warning details and resolve non-fatal environment issues.

## Debugging Techniques

- Global debug flag:

```bash
mailgoat --debug send --to user@example.com --subject "x" --body "x"
```

- Namespace debug:

```bash
DEBUG=mailgoat:api mailgoat send --to user@example.com --subject "x" --body "x"
```

- JSON output for tooling:

```bash
mailgoat send --to user@example.com --subject "x" --body "x" --json
```

## Gotchas Checklist

- Firewall and NAT rules for webhook ingress.
- Correct webhook `--path` alignment with Postal configuration.
- Docker bridge networking mismatch.
- Stale credentials in CI secrets.
- Misconfigured TLS/proxy interception.
