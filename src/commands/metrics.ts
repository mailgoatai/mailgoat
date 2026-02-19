import { Command } from 'commander';
import * as http from 'http';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { metrics } from '../lib/metrics';

async function checkDiskSpace(): Promise<{ ok: boolean; freeBytes?: number; error?: string }> {
  try {
    const home = os.homedir();
    const stat = await fs.statfs(home);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    return { ok: freeBytes > 100 * 1024 * 1024, freeBytes };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function buildHealthResponse(): Promise<Record<string, unknown>> {
  const checks: Record<string, { ok: boolean; message: string }> = {
    config: { ok: false, message: 'not checked' },
    api: { ok: false, message: 'not checked' },
    disk: { ok: false, message: 'not checked' },
  };

  let config;
  try {
    config = await new ConfigManager().load();
    checks.config = { ok: true, message: 'configuration valid' };
  } catch (error: unknown) {
    checks.config = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (config) {
    try {
      const client = new PostalClient(config);
      await client.getMessage('health-check-test-id');
      checks.api = { ok: true, message: 'postal API reachable' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.toLowerCase().includes('authentication') ||
        message.toLowerCase().includes('invalid')
      ) {
        checks.api = { ok: true, message: 'postal API reachable (auth rejected test id)' };
      } else {
        checks.api = { ok: false, message };
      }
    }
  }

  const disk = await checkDiskSpace();
  checks.disk = {
    ok: disk.ok,
    message: disk.ok ? `free bytes: ${disk.freeBytes}` : disk.error || 'low disk space',
  };

  const healthy = Object.values(checks).every((value) => value.ok);
  return {
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  };
}

function serveServer(port: number): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.statusCode = 200;
      res.setHeader('Content-Type', metrics.getRegistry().contentType);
      res.end(await metrics.getMetricsText());
      return;
    }

    if (req.url === '/health') {
      const health = await buildHealthResponse();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(health));
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/metrics', '/health'] }));
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Metrics server listening at http://127.0.0.1:${port}/metrics`);
    console.log(`Health endpoint listening at http://127.0.0.1:${port}/health`);
  });
}

export function createMetricsCommand(): Command {
  const cmd = new Command('metrics').description('Prometheus metrics and health endpoint');

  cmd
    .command('serve')
    .description('Serve /metrics and /health endpoints')
    .option('--metrics-port <port>', 'Port to bind metrics HTTP server', '9090')
    .option('--daemon', 'Run in background', false)
    .action(async (options) => {
      const port = Number(options.metricsPort || 9090);
      if (!Number.isInteger(port) || port <= 0) {
        throw new Error('Invalid --metrics-port value');
      }

      if (options.daemon) {
        const args = process.argv.slice(1).filter((value) => value !== '--daemon');
        const child = spawn(process.execPath, args, {
          detached: true,
          stdio: 'ignore',
          cwd: process.cwd(),
          env: process.env,
        });
        child.unref();
        console.log(`Started metrics daemon on port ${port}`);
        return;
      }

      serveServer(port);
    });

  return cmd;
}

export { buildHealthResponse };
