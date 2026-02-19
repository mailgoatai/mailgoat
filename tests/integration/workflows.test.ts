import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';

const BIN = path.resolve(__dirname, '../../src/index.ts');
const REPO_ROOT = path.resolve(__dirname, '../..');
const ADMIN_DIST_DIR = path.join(REPO_ROOT, 'admin-ui', 'dist');
const ADMIN_INDEX_PATH = path.join(ADMIN_DIST_DIR, 'index.html');

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<CliResult> {
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

function waitForAdminServer(url: string, timeoutMs = 15000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (response.status === 200 || response.status === 401) {
          resolve();
          return;
        }
      } catch {
        // Ignore transient startup errors.
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for admin server at ${url}`));
        return;
      }

      setTimeout(poll, 100);
    };

    void poll();
  });
}

describe('workflow integration suite', () => {
  let homeDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    homeDir = mkdtempSync(path.join(tmpdir(), 'mailgoat-workflows-'));
    mkdirSync(path.join(homeDir, '.mailgoat'), { recursive: true });
    writeFileSync(
      path.join(homeDir, '.mailgoat', 'config.json'),
      JSON.stringify(
        {
          server: 'http://127.0.0.1:65530',
          fromAddress: 'workflow@test.local',
          fromName: 'Workflow Runner',
          api_key: 'workflow_api_key_12345',
        },
        null,
        2
      )
    );

    env = {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
    };
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  test('config set + show persists server URL', async () => {
    const setResult = await runCli(['config', 'set', 'server', 'https://mail.workflow.test'], env);
    expect(setResult.code).toBe(0);

    const showResult = await runCli(['config', 'show'], env);
    expect(showResult.code).toBe(0);
    expect(showResult.stdout).toContain('https://mail.workflow.test');
  });

  test('config get returns updated api key', async () => {
    const setResult = await runCli(['config', 'set', 'api_key', 'workflow_key_67890'], env);
    expect(setResult.code).toBe(0);

    const getResult = await runCli(['config', 'get', 'api_key'], env);
    expect(getResult.code).toBe(0);
    expect(getResult.stdout).toContain('workflow_key_67890');
  });

  test('config path returns expected location', async () => {
    const pathResult = await runCli(['config', 'path'], env);
    expect(pathResult.code).toBe(0);
    expect(pathResult.stdout).toContain('.mailgoat/config.json');
  });

  test('config get unknown key fails cleanly', async () => {
    const result = await runCli(['config', 'get', 'does_not_exist'], env);
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('not found');
  });

  test('send dry-run returns valid JSON payload', async () => {
    const result = await runCli(
      [
        'send',
        '--to',
        'test@example.com',
        '--subject',
        'Hi',
        '--body',
        'Hello',
        '--dry-run',
        '--json',
      ],
      env
    );
    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.mode).toBe('dry-run');
    expect(payload.valid).toBe(true);
  });

  test('send validates missing required fields', async () => {
    const result = await runCli(
      ['send', '--to', 'test@example.com', '--subject', 'Missing body'],
      env
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('required');
  });

  test('send handles invalid recipient email', async () => {
    const result = await runCli(
      ['send', '--to', 'invalid-email', '--subject', 'Hello', '--body', 'Test', '--dry-run'],
      env
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('email');
  });

  test('send surfaces network failure without raw runtime trace', async () => {
    const result = await runCli(
      ['send', '--to', 'test@example.com', '--subject', 'Net', '--body', 'Check', '--no-retry'],
      env
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('network');
    expect(result.stderr.toLowerCase()).not.toContain('typeerror');
  });

  test('inbox list works against empty local cache', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const result = await runCli(['inbox', 'list', '--db-path', dbPath], env);
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toContain('no messages');
  });

  test('inbox search works against empty local cache', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const result = await runCli(['inbox', 'search', 'subject:test', '--db-path', dbPath], env);
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toContain('no messages');
  });

  test('inbox list handles out-of-range limits gracefully', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const result = await runCli(['inbox', 'list', '--db-path', dbPath, '--limit', '0'], env);
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toContain('no messages');
  });

  test('inbox search handles out-of-range limits gracefully', async () => {
    const dbPath = path.join(homeDir, '.mailgoat', 'inbox', 'messages.db');
    const result = await runCli(
      ['inbox', 'search', 'subject:test', '--db-path', dbPath, '--limit', '1001'],
      env
    );
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toContain('no messages');
  });

  test('admin status endpoint requires authentication', async () => {
    mkdirSync(ADMIN_DIST_DIR, { recursive: true });
    const previousAdminIndex = existsSync(ADMIN_INDEX_PATH)
      ? readFileSync(ADMIN_INDEX_PATH, 'utf8')
      : null;
    writeFileSync(ADMIN_INDEX_PATH, '<!doctype html><html><body>admin</body></html>');

    const port = 3910;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: {
          ...env,
          ADMIN_PASSWORD: 'workflow_admin_password',
          SESSION_SECRET: '12345678901234567890123456789012',
          POSTAL_DB_URL: 'postgres://user:pass@127.0.0.1:5999/postal',
        },
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForAdminServer(`http://127.0.0.1:${port}/api/admin/status`);
      const status = await fetch(`http://127.0.0.1:${port}/api/admin/status`);
      expect(status.status).toBe(401);
    } finally {
      child.kill('SIGTERM');
      if (previousAdminIndex === null) {
        rmSync(ADMIN_INDEX_PATH, { force: true });
      } else {
        writeFileSync(ADMIN_INDEX_PATH, previousAdminIndex);
      }
    }
  });

  test('admin login accepts valid password', async () => {
    mkdirSync(ADMIN_DIST_DIR, { recursive: true });
    const previousAdminIndex = existsSync(ADMIN_INDEX_PATH)
      ? readFileSync(ADMIN_INDEX_PATH, 'utf8')
      : null;
    writeFileSync(ADMIN_INDEX_PATH, '<!doctype html><html><body>admin</body></html>');

    const port = 3911;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: {
          ...env,
          ADMIN_PASSWORD: 'workflow_admin_password',
          SESSION_SECRET: '12345678901234567890123456789012',
          POSTAL_DB_URL: 'postgres://user:pass@127.0.0.1:5999/postal',
        },
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForAdminServer(`http://127.0.0.1:${port}/api/admin/status`);
      const login = await fetch(`http://127.0.0.1:${port}/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'workflow_admin_password' }),
      });
      expect(login.status).toBe(200);
    } finally {
      child.kill('SIGTERM');
      if (previousAdminIndex === null) {
        rmSync(ADMIN_INDEX_PATH, { force: true });
      } else {
        writeFileSync(ADMIN_INDEX_PATH, previousAdminIndex);
      }
    }
  });

  test('admin login rejects invalid password', async () => {
    mkdirSync(ADMIN_DIST_DIR, { recursive: true });
    const previousAdminIndex = existsSync(ADMIN_INDEX_PATH)
      ? readFileSync(ADMIN_INDEX_PATH, 'utf8')
      : null;
    writeFileSync(ADMIN_INDEX_PATH, '<!doctype html><html><body>admin</body></html>');

    const port = 3912;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: {
          ...env,
          ADMIN_PASSWORD: 'workflow_admin_password',
          SESSION_SECRET: '12345678901234567890123456789012',
          POSTAL_DB_URL: 'postgres://user:pass@127.0.0.1:5999/postal',
        },
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForAdminServer(`http://127.0.0.1:${port}/api/admin/status`);
      const login = await fetch(`http://127.0.0.1:${port}/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong_password' }),
      });
      expect(login.status).toBe(401);
    } finally {
      child.kill('SIGTERM');
      if (previousAdminIndex === null) {
        rmSync(ADMIN_INDEX_PATH, { force: true });
      } else {
        writeFileSync(ADMIN_INDEX_PATH, previousAdminIndex);
      }
    }
  });

  test('admin inbox endpoints remain protected without session', async () => {
    mkdirSync(ADMIN_DIST_DIR, { recursive: true });
    const previousAdminIndex = existsSync(ADMIN_INDEX_PATH)
      ? readFileSync(ADMIN_INDEX_PATH, 'utf8')
      : null;
    writeFileSync(ADMIN_INDEX_PATH, '<!doctype html><html><body>admin</body></html>');

    const port = 3913;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register', BIN, 'admin', 'serve', '--port', String(port)],
      {
        env: {
          ...env,
          ADMIN_PASSWORD: 'workflow_admin_password',
          SESSION_SECRET: '12345678901234567890123456789012',
          POSTAL_DB_URL: 'postgres://user:pass@127.0.0.1:5999/postal',
        },
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    try {
      await waitForAdminServer(`http://127.0.0.1:${port}/api/admin/status`);

      const inboxes = await fetch(`http://127.0.0.1:${port}/api/admin/inboxes`);
      expect(inboxes.status).toBe(401);

      const emails = await fetch(`http://127.0.0.1:${port}/api/admin/inboxes/1/emails`);
      expect([401, 404]).toContain(emails.status);

      const emailsAlias = await fetch(`http://127.0.0.1:${port}/api/admin/inbox/1/emails`);
      expect([401, 404]).toContain(emailsAlias.status);
    } finally {
      child.kill('SIGTERM');
      if (previousAdminIndex === null) {
        rmSync(ADMIN_INDEX_PATH, { force: true });
      } else {
        writeFileSync(ADMIN_INDEX_PATH, previousAdminIndex);
      }
    }
  });
});
