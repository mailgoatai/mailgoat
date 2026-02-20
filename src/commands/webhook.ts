import { Command } from 'commander';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as childProcess from 'child_process';
import { ConfigManager } from '../lib/config';
import { InboxStore } from '../lib/inbox-store';
import { PostalClient } from '../lib/postal-client';
import {
  getDefaultWebhookLogPath,
  getDefaultWebhookPidPath,
  processWebhookEvent,
  replayWebhookEvent,
  tailWebhookLogs,
  verifyWebhookSignature,
} from '../lib/webhook-service';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Invalid port number');
  }
  return port;
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function createWebhookCommand(): Command {
  const cmd = new Command('webhook').description('Webhook server and Postal webhook management');

  cmd
    .command('serve')
    .description('Run webhook receiver server')
    .option('--host <host>', 'Bind address', '127.0.0.1')
    .option('--port <port>', 'Port to listen on', '3000')
    .option('--path <path>', 'Webhook path', '/webhook')
    .option('--secret <secret>', 'Webhook HMAC secret (or MAILGOAT_WEBHOOK_SECRET)')
    .option('--db-path <path>', 'Path to SQLite inbox database')
    .option('--log-path <path>', 'Path to webhook event log file', getDefaultWebhookLogPath())
    .option('--daemon', 'Run in detached background process', false)
    .option('--pid-file <path>', 'PID file path', getDefaultWebhookPidPath())
    .option('--tls', 'Enable HTTPS/TLS', false)
    .option('--cert <path>', 'TLS certificate path')
    .option('--key <path>', 'TLS private key path')
    .option('--rate-limit-window-ms <n>', 'Rate-limit window in ms', '60000')
    .option('--rate-limit-max <n>', 'Rate-limit max requests per IP per window', '120')
    .option('--tunnel', 'Start ngrok tunnel and print URL', false)
    .action(async (options) => {
      const port = parsePort(options.port);
      const host = options.host;
      const webhookPath = options.path;
      const secret = options.secret || process.env.MAILGOAT_WEBHOOK_SECRET;
      const rateWindowMs = toNumber(options.rateLimitWindowMs);
      const rateLimitMax = toNumber(options.rateLimitMax);
      const ipWindow = new Map<string, { count: number; resetAt: number }>();

      if (options.daemon && !process.env.MAILGOAT_WEBHOOK_DAEMONIZED) {
        const args = process.argv.slice(1).filter((v) => v !== '--daemon');
        const child = childProcess.spawn(process.execPath, args, {
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, MAILGOAT_WEBHOOK_DAEMONIZED: '1' },
        });
        child.unref();
        await fsp.mkdir(path.dirname(options.pidFile), { recursive: true });
        await fsp.writeFile(options.pidFile, String(child.pid), 'utf8');
        console.log(`Webhook server daemon started (pid ${child.pid})`);
        return;
      }

      const store = new InboxStore(options.dbPath);
      const listener = async (req: http.IncomingMessage, res: http.ServerResponse) => {
        if (req.method === 'GET' && req.url === '/health') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.method === 'GET' && req.url === '/metrics') {
          const lines = [
            '# HELP mailgoat_webhook_requests_total Total webhook requests',
            '# TYPE mailgoat_webhook_requests_total counter',
            `mailgoat_webhook_requests_total ${req.socket.bytesRead > 0 ? 1 : 0}`,
          ];
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; version=0.0.4');
          res.end(lines.join('\n'));
          return;
        }

        if (req.method !== 'POST' || req.url !== webhookPath) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }

        const ip = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const current = ipWindow.get(ip);
        if (!current || now > current.resetAt) {
          ipWindow.set(ip, { count: 1, resetAt: now + rateWindowMs });
        } else {
          current.count += 1;
          if (current.count > rateLimitMax) {
            res.statusCode = 429;
            res.end('Rate limit exceeded');
            return;
          }
        }

        let body = '';
        req.on('data', (chunk) => {
          body += String(chunk);
        });
        req.on('end', async () => {
          try {
            const headerMap: Record<string, string | string[] | undefined> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              headerMap[key.toLowerCase()] = value;
            }

            if (!verifyWebhookSignature(body, headerMap, secret)) {
              res.statusCode = 401;
              res.end('Invalid signature');
              return;
            }

            const payload = JSON.parse(body);
            const result = await processWebhookEvent(store, payload, { logPath: options.logPath });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (error: unknown) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              })
            );
          }
        });
      };

      const server =
        options.tls && options.cert && options.key
          ? https.createServer(
              {
                cert: fs.readFileSync(options.cert),
                key: fs.readFileSync(options.key),
              },
              listener
            )
          : http.createServer(listener);

      server.listen(port, host, () => {
        const protocol = options.tls ? 'https' : 'http';
        console.log(`Webhook server started on ${protocol}://${host}:${port}${webhookPath}`);
      });

      if (options.tunnel) {
        try {
          const ngrok = require('ngrok');
          const tunnelUrl: string = await ngrok.connect({ addr: port });
          console.log(`Tunnel URL: ${tunnelUrl}`);
        } catch {
          console.error('Tunnel requested but ngrok package is not installed');
        }
      }

      const shutdown = async () => {
        server.close(() => {
          store.close();
          process.exit(0);
        });
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  cmd
    .command('register')
    .requiredOption('--url <url>', 'Webhook URL to register')
    .option('--name <name>', 'Webhook name', 'mailgoat-webhook')
    .action(async (options) => {
      const config = await new ConfigManager().load();
      const client = new PostalClient(config);
      const response = await client.createWebhook(options.url, options.name);
      console.log(JSON.stringify(response, null, 2));
    });

  cmd.command('list').action(async () => {
    const config = await new ConfigManager().load();
    const client = new PostalClient(config);
    const response = await client.listWebhooks();
    console.log(JSON.stringify(response, null, 2));
  });

  cmd
    .command('unregister')
    .argument('<id>', 'Webhook id')
    .action(async (id: string) => {
      const config = await new ConfigManager().load();
      const client = new PostalClient(config);
      const response = await client.deleteWebhook(id);
      console.log(JSON.stringify(response, null, 2));
    });

  cmd.command('test').action(async () => {
    const config = await new ConfigManager().load();
    const client = new PostalClient(config);
    const response = await client.testWebhook();
    console.log(JSON.stringify(response, null, 2));
  });

  cmd
    .command('logs')
    .option('--tail', 'Follow logs continuously', false)
    .option('--log-path <path>', 'Path to log file', getDefaultWebhookLogPath())
    .action(async (options) => {
      if (!options.tail) {
        const content = await fsp.readFile(options.logPath, 'utf8').catch(() => '');
        process.stdout.write(content);
        return;
      }
      await tailWebhookLogs(options.logPath, (line) => {
        console.log(line);
      });
      console.log(`Tailing ${options.logPath} ...`);
    });

  cmd
    .command('replay')
    .argument('<eventId>', 'Event id to replay')
    .option('--db-path <path>', 'Path to SQLite inbox database')
    .option('--log-path <path>', 'Path to webhook event log file', getDefaultWebhookLogPath())
    .action(async (eventId: string, options) => {
      const store = new InboxStore(options.dbPath);
      try {
        const result = await replayWebhookEvent(store, eventId, { logPath: options.logPath });
        console.log(JSON.stringify(result, null, 2));
      } finally {
        store.close();
      }
    });

  return cmd;
}
