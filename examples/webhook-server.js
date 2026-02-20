#!/usr/bin/env node

/**
 * Simple webhook receiver for MailGoat-related events.
 *
 * Usage:
 *   node webhook-server.js [--port 3000]
 */

const http = require('http');

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (isHelp) {
  console.log('Usage: node webhook-server.js [--port 3000]');
  process.exit(0);
}

const port = Number(argValue('--port', '3000'));

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'mailgoat-webhook-example' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/webhooks/mailgoat') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch (_err) {
        // Keep payload empty if parsing fails.
      }

      const eventType = payload.event || payload.type || 'unknown';
      const messageId = payload.message_id || payload.id || 'n/a';
      console.log(`[webhook] type=${eventType} messageId=${messageId}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Webhook server listening on http://127.0.0.1:${port}`);
  console.log(`POST webhook events to http://127.0.0.1:${port}/webhooks/mailgoat`);
});
