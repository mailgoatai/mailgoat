# AWS Lambda Integration

Invoke MailGoat from a Lambda function for transactional sends.

## Dependencies

- Node.js 18+ Lambda runtime
- `mailgoat` binary available in deployment package or Lambda layer
- Env vars: `MAILGOAT_SERVER_URL`, `MAILGOAT_API_KEY`

## Event payload

```json
{
  "recipient": "user@example.com",
  "subject": "Welcome",
  "message": "Thanks for joining"
}
```

## Gotchas / Troubleshooting

- `ENOENT mailgoat`: include the binary in a Lambda layer and add to PATH.
- Timeouts: increase function timeout for network retries.
- Permission errors: verify outbound network and Postal endpoint reachability.
