import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

const BIN = path.resolve(__dirname, '../../src/index.ts');
const REPO_ROOT = path.resolve(__dirname, '../..');
const ADMIN_DIST_DIR = path.join(REPO_ROOT, 'admin-ui', 'dist');
const ADMIN_INDEX_PATH = path.join(ADMIN_DIST_DIR, 'index.html');

jest.setTimeout(60000);

type ExecResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-r', 'ts-node/register', BIN, ...args], {
      env,
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

describe('CLI workflow integration', () => {
  let homeDir: string;
  let baseEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    homeDir = mkdtempSync(path.join(tmpdir(), 'mailgoat-workflow-'));
    mkdirSync(path.join(homeDir, '.mailgoat'), { recursive: true });
    writeFileSync(
      path.join(homeDir, '.mailgoat', 'config.json'),
      JSON.stringify(
        {
          server: 'http://127.0.0.1:65530',
          fromAddress: 'sender@test.local',
          fromName: 'Workflow Tester',
          api_key: 'test_api_key_12345',
        },
        null,
        2
      )
    );

    baseEnv = {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
    };
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it('saves and reads config values via CLI', async () => {
    const setServer = await runCli(
      ['config', 'set', 'server', 'https://mail.example.com'],
      baseEnv
    );
    expect(setServer.code).toBe(0);

    const setKey = await runCli(['config', 'set', 'api_key', 'integration_key_123456'], baseEnv);
    expect(setKey.code).toBe(0);

    const show = await runCli(['config', 'show'], baseEnv);
    expect(show.code).toBe(0);
    expect(show.stdout).toContain('https://mail.example.com');
  });

  it('reads back single config value', async () => {
    const setServer = await runCli(
      ['config', 'set', 'server', 'https://mail.example.com'],
      baseEnv
    );
    expect(setServer.code).toBe(0);

    const getServer = await runCli(['config', 'get', 'server'], baseEnv);
    expect(getServer.code).toBe(0);
    expect(getServer.stdout).toContain('https://mail.example.com');
  });

  it('returns path for active config file', async () => {
    const pathRes = await runCli(['config', 'path'], baseEnv);
    expect(pathRes.code).toBe(0);
    expect(pathRes.stdout).toContain('.mailgoat/config.json');
  });

  it('validates dry-run workflow without sending', async () => {
    const result = await runCli(
      [
        'send',
        '--to',
        'test@example.com',
        '--subject',
        'Dry Run',
        '--body',
        'Hello',
        '--dry-run',
        '--json',
      ],
      baseEnv
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.mode).toBe('dry-run');
    expect(payload.valid).toBe(true);
  });

  it('handles connection failures with actionable messaging', async () => {
    const result = await runCli(
      ['send', '--to', 'test@example.com', '--subject', 'Test', '--body', 'Hello', '--no-retry'],
      baseEnv
    );

    expect(result.code).not.toBe(0);
    const stderr = result.stderr.toLowerCase();
    expect(stderr).toContain('network error');
    expect(stderr).not.toContain('typeerror');
  });

  it('supports inbox list command on empty cache', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const list = await runCli(['inbox', 'list', '--db-path', dbPath], baseEnv);
    expect(list.code).toBe(0);
    expect(list.stdout.toLowerCase()).toContain('no messages');
  });

  it('supports inbox search command on empty cache', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const search = await runCli(
      ['inbox', 'search', 'subject:invoice', '--db-path', dbPath],
      baseEnv
    );
    expect(search.code).toBe(0);
    expect(search.stdout.toLowerCase()).toContain('no messages');
  });

  it('fails gracefully for unknown config key', async () => {
    const getMissing = await runCli(['config', 'get', 'does.not.exist'], baseEnv);
    expect(getMissing.code).not.toBe(0);
    expect(getMissing.stderr.toLowerCase()).toContain('not found');
  });

  it('supports live send workflow when MAILGOAT_INT_SERVER and MAILGOAT_INT_KEY are provided', async () => {
    if (!process.env.MAILGOAT_INT_SERVER || !process.env.MAILGOAT_INT_KEY) {
      expect(true).toBe(true);
      return;
    }

    const env = {
      ...baseEnv,
      MAILGOAT_SERVER: process.env.MAILGOAT_INT_SERVER,
      MAILGOAT_API_KEY: process.env.MAILGOAT_INT_KEY,
      MAILGOAT_FROM_ADDRESS: process.env.MAILGOAT_INT_FROM || 'sender@test.local',
    };

    const result = await runCli(
      ['send', '--to', 'test@example.com', '--subject', 'Integration', '--body', 'Hello'],
      env
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Email sent successfully');
  });
});

describe('Admin panel workflow (integration)', () => {
  let homeDir: string;
  let baseEnv: NodeJS.ProcessEnv;
  let previousAdminIndex: string | null;

  function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tryOnce = async () => {
        try {
          const res = await fetch(url);
          if (res.status === 401 || res.status === 200) {
            resolve();
            return;
          }
        } catch {
          // retry until timeout
        }
        if (Date.now() - started > timeoutMs) {
          reject(new Error('Timed out waiting for admin server'));
          return;
        }
        setTimeout(tryOnce, 100);
      };
      void tryOnce();
    });
  }

  beforeEach(() => {
    homeDir = mkdtempSync(path.join(tmpdir(), 'mailgoat-admin-int-'));
    mkdirSync(path.join(homeDir, '.mailgoat'), { recursive: true });

    mkdirSync(ADMIN_DIST_DIR, { recursive: true });
    previousAdminIndex = existsSync(ADMIN_INDEX_PATH)
      ? readFileSync(ADMIN_INDEX_PATH, 'utf8')
      : null;
    writeFileSync(ADMIN_INDEX_PATH, '<!doctype html><html><body>admin</body></html>');

    baseEnv = {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
      ADMIN_PASSWORD: 'super_secure_admin_password',
      SESSION_SECRET: '12345678901234567890123456789012',
      POSTAL_DB_URL: 'postgres://user:pass@127.0.0.1:5999/postal',
    };
  });

  afterEach(() => {
    if (previousAdminIndex === null) {
      rmSync(ADMIN_INDEX_PATH, { force: true });
    } else {
      writeFileSync(ADMIN_INDEX_PATH, previousAdminIndex);
    }
    rmSync(homeDir, { recursive: true, force: true });
  });

  it('rejects unauthenticated status request', async () => {
    const port = 3902;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: baseEnv,
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForServer(`http://127.0.0.1:${port}/api/admin/status`);
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/status`);
      expect(res.status).toBe(401);
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('accepts login with correct admin password', async () => {
    const port = 3903;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: baseEnv,
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForServer(`http://127.0.0.1:${port}/api/admin/status`);
      const login = await fetch(`http://127.0.0.1:${port}/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'super_secure_admin_password' }),
      });
      expect(login.status).toBe(200);
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('rejects login with invalid password', async () => {
    const port = 3904;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: baseEnv,
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForServer(`http://127.0.0.1:${port}/api/admin/status`);
      const login = await fetch(`http://127.0.0.1:${port}/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password' }),
      });
      expect(login.status).toBe(401);
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('protects inbox endpoints behind auth', async () => {
    const port = 3905;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: baseEnv,
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForServer(`http://127.0.0.1:${port}/api/admin/status`);

      const inboxes = await fetch(`http://127.0.0.1:${port}/api/admin/inboxes`);
      expect(inboxes.status).toBe(401);

      const emails = await fetch(`http://127.0.0.1:${port}/api/admin/inboxes/1/emails`);
      expect([401, 404]).toContain(emails.status);

      const emailsAlias = await fetch(`http://127.0.0.1:${port}/api/admin/inbox/1/emails`);
      expect([401, 404]).toContain(emailsAlias.status);

      const events = await fetch(`http://127.0.0.1:${port}/api/admin/events`);
      expect(events.status).toBe(401);
    } finally {
      child.kill('SIGTERM');
    }
  });
});
