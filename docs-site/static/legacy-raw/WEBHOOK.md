# Webhook Server

MailGoat includes a built-in webhook receiver and Postal webhook management commands.

## Start Server

```bash
mailgoat webhook serve --host 127.0.0.1 --port 3000 --path /webhook
```

Optional production flags:

- `--tls --cert <cert.pem> --key <key.pem>`
- `--daemon --pid-file ~/.mailgoat/webhook.pid`
- `--secret <hmac-secret>` (or `MAILGOAT_WEBHOOK_SECRET`)
- `--tunnel` (starts ngrok if installed)

Health and metrics:

- `GET /health` returns `200` + JSON
- `GET /metrics` returns Prometheus text format

## Postal Webhook Commands

```bash
mailgoat webhook register --url https://example.com/webhook
mailgoat webhook list
mailgoat webhook test
mailgoat webhook unregister <id>
```

## Event Logs

Events are appended as JSON lines to `~/.mailgoat/webhook-events.log`.

```bash
mailgoat webhook logs
mailgoat webhook logs --tail
```

## Replay

Re-run handlers for a stored event:

```bash
mailgoat webhook replay <event-id>
```

## Custom Handlers

Put JS handlers in `~/.mailgoat/handlers/`:

- `on-message-received.js`
- `on-message-sent.js`
- `on-message-delivered.js`
- `on-message-bounced.js`
- `on-event.js` (runs for all events)

Example:

```javascript
module.exports = async (event) => {
  if (event.event !== 'MessageReceived') return;
  if ((event.message?.subject || '').includes('URGENT')) {
    return { action: 'flagged-urgent' };
  }
  return { action: 'ignored' };
};
```
