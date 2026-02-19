const { test } = require('playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUT_DIR = '/Users/vibe/.opengoat/workspaces/developer-4/mailgoat/docs/images/admin-panel';
const LE = '/Users/vibe/.opengoat/workspaces/lead-engineer/mailgoat';
const DEV2 = '/Users/vibe/.opengoat/workspaces/developer-2/mailgoat/dashboard';

let loginProc;
let dashboardServer;
let inboxServer;

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveStatic(root, reqPath, res) {
  const rel = reqPath.replace(/^\/+/, '');
  const filePath = path.join(root, rel);
  if (!filePath.startsWith(root)) {
    res.writeHead(403); res.end('forbidden'); return true;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath);
  const map = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
  res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function annotate(page, labels) {
  return page.evaluate((items) => {
    const existing = document.getElementById('__shot_annotations');
    if (existing) existing.remove();
    const layer = document.createElement('div');
    layer.id = '__shot_annotations';
    layer.style.position = 'fixed';
    layer.style.inset = '0';
    layer.style.zIndex = '99999';
    layer.style.pointerEvents = 'none';
    for (const item of items) {
      const dot = document.createElement('div');
      dot.textContent = String(item.n);
      Object.assign(dot.style, {
        position: 'absolute', left: item.x, top: item.y, width: '28px', height: '28px', borderRadius: '999px',
        background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '700', fontFamily: 'ui-sans-serif, system-ui', boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
      });
      const txt = document.createElement('div');
      txt.textContent = item.t;
      Object.assign(txt.style, {
        position: 'absolute', left: item.tx, top: item.ty, padding: '4px 8px', borderRadius: '6px',
        background: 'rgba(15,23,42,0.9)', color: '#fff', fontSize: '12px', fontFamily: 'ui-sans-serif, system-ui', maxWidth: '260px'
      });
      layer.appendChild(dot);
      layer.appendChild(txt);
    }
    document.body.appendChild(layer);
  }, labels);
}

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  loginProc = spawn('node', ['bin/mailgoat.js', 'admin', 'serve', '--host', '127.0.0.1', '--port', '4310'], {
    cwd: LE,
    env: { ...process.env, ADMIN_PASSWORD: 'super-secure-password', SESSION_SECRET: 'super-secret-session-key' },
    stdio: 'ignore',
  });

  dashboardServer = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1:4311');
    if (u.pathname === '/api/admin/stats/overview') {
      return sendJson(res, {
        totalSent: 1420, totalReceived: 2310, last24h: 184, last7d: 1022,
        messagesOverTime: [
          { label: 'Mon', sent: 140, received: 210 }, { label: 'Tue', sent: 170, received: 260 },
          { label: 'Wed', sent: 160, received: 245 }, { label: 'Thu', sent: 190, received: 300 },
          { label: 'Fri', sent: 210, received: 320 },
        ],
        statusBreakdown: { delivered: 3200, pending: 220, failed: 140, bounced: 65 },
      });
    }
    if (u.pathname === '/api/admin/stats/by-inbox') {
      return sendJson(res, { inboxes: [
        { inbox: 'alerts@mailgoat.ai', sent: 320, received: 860 },
        { inbox: 'ops@mailgoat.ai', sent: 440, received: 520 },
        { inbox: 'billing@mailgoat.ai', sent: 260, received: 470 },
        { inbox: 'support@mailgoat.ai', sent: 400, received: 460 },
      ]});
    }
    if (u.pathname === '/api/admin/inboxes') {
      return sendJson(res, { inboxes: [
        { id: 'alerts@mailgoat.ai', inbox: 'alerts@mailgoat.ai', totalReceived: 860, lastMessageAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
        { id: 'ops@mailgoat.ai', inbox: 'ops@mailgoat.ai', totalReceived: 520, lastMessageAt: new Date(Date.now() - 34 * 60 * 1000).toISOString() },
        { id: 'billing@mailgoat.ai', inbox: 'billing@mailgoat.ai', totalReceived: 470, lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
      ]});
    }

    if (u.pathname === '/admin' || u.pathname === '/admin/' || u.pathname === '/admin/dashboard') {
      const html = fs.readFileSync(path.join(DEV2, 'index.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    }

    if (u.pathname === '/admin/app.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(fs.readFileSync(path.join(DEV2, 'app.js'), 'utf-8'));
    }
    if (u.pathname === '/admin/styles.css') {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      return res.end(fs.readFileSync(path.join(DEV2, 'styles.css'), 'utf-8'));
    }

    res.writeHead(404); res.end('not found');
  }).listen(4311, '127.0.0.1');

  const leadDash = path.join(LE, 'dashboard');
  inboxServer = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1:4312');
    if (u.pathname === '/api/admin/stats/by-inbox') {
      return sendJson(res, { inboxes: [{ name: 'alerts@mailgoat.ai', incoming: 128, outgoing: 44 }] });
    }
    if (u.pathname === '/api/admin/inboxes') {
      return sendJson(res, {
        inboxes: [{ name: 'alerts@mailgoat.ai', totalReceived: 128, status: 'active', lastReceived: new Date(Date.now() - 25 * 60 * 1000).toISOString() }],
      });
    }
    if (u.pathname.startsWith('/api/admin/inboxes/') && u.pathname.endsWith('/messages')) {
      return sendJson(res, {
        inbox: 'alerts@mailgoat.ai', limit: 500, offset: 0,
        messages: [
          { id: 'msg_1001', from: 'infra@acme.ai', subject: 'Delivery latency report', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), status: 'delivered' },
          { id: 'msg_1002', from: 'noreply@billing.example', subject: 'Payment retry notice', timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), status: 'pending' },
          { id: 'msg_1003', from: 'mailer-daemon@example.net', subject: 'Bounce summary', timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), status: 'failed' },
        ],
      });
    }
    if (u.pathname.startsWith('/api/admin/messages/')) {
      return sendJson(res, {
        id: 'msg_1001', from: 'infra@acme.ai', to: 'alerts@mailgoat.ai', subject: 'Delivery latency report',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), status: 'delivered',
        text: 'Hourly summary: p50=210ms, p95=690ms, p99=1.2s.',
        html: '<p><strong>Hourly summary</strong>: p50=210ms, p95=690ms, p99=1.2s.</p>',
        rawBody: 'From: infra@acme.ai\\nTo: alerts@mailgoat.ai\\nSubject: Delivery latency report\\n\\nHourly summary...',
        headers: { 'message-id': '<msg_1001@example>' },
      });
    }

    if (u.pathname === '/admin' || u.pathname.startsWith('/admin/inbox/')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(path.join(leadDash, 'index.html'), 'utf-8'));
    }

    if (serveStatic(leadDash, u.pathname, res)) return;
    res.writeHead(404); res.end('not found');
  }).listen(4312, '127.0.0.1');

  await new Promise((r) => setTimeout(r, 1500));
});

test.afterAll(async () => {
  if (dashboardServer) await new Promise((r) => dashboardServer.close(r));
  if (inboxServer) await new Promise((r) => inboxServer.close(r));
  if (loginProc) loginProc.kill('SIGTERM');
});

test('capture screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1540, height: 980 });

  await page.goto('http://127.0.0.1:4310/admin/login', { waitUntil: 'networkidle' });
  await annotate(page, [
    { n: 1, t: 'Enter ADMIN_PASSWORD here', x: '720px', y: '420px', tx: '760px', ty: '420px' },
    { n: 2, t: 'Click to start authenticated session', x: '720px', y: '500px', tx: '760px', ty: '500px' },
  ]);
  await page.screenshot({ path: `${OUT_DIR}/admin-login-annotated.png`, fullPage: true });

  await page.goto('http://127.0.0.1:4311/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await annotate(page, [
    { n: 1, t: 'Total sent/received cards', x: '190px', y: '160px', tx: '230px', ty: '160px' },
    { n: 2, t: 'Last 24h and 7d activity cards', x: '540px', y: '160px', tx: '580px', ty: '160px' },
    { n: 3, t: 'Message trend chart over time', x: '220px', y: '390px', tx: '260px', ty: '390px' },
    { n: 4, t: 'Per-inbox volume comparison', x: '770px', y: '390px', tx: '810px', ty: '390px' },
    { n: 5, t: 'Status mix chart + refresh controls', x: '1160px', y: '390px', tx: '1200px', ty: '390px' },
    { n: 6, t: 'Active inbox table (click inbox name)', x: '200px', y: '760px', tx: '240px', ty: '760px' },
  ]);
  await page.screenshot({ path: `${OUT_DIR}/dashboard-overview-annotated.png`, fullPage: true });

  await page.goto('http://127.0.0.1:4312/admin/inbox/alerts%40mailgoat.ai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('table.message-list tbody tr:first-child');
  await page.waitForTimeout(400);
  await annotate(page, [
    { n: 1, t: 'Search and filter controls', x: '220px', y: '250px', tx: '260px', ty: '250px' },
    { n: 2, t: 'Message list with status icons', x: '220px', y: '380px', tx: '260px', ty: '380px' },
    { n: 3, t: 'Selected message details', x: '980px', y: '380px', tx: '1020px', ty: '380px' },
    { n: 4, t: 'Viewer modes: Text / HTML / Raw', x: '980px', y: '510px', tx: '1020px', ty: '510px' },
  ]);
  await page.screenshot({ path: `${OUT_DIR}/inbox-details-annotated.png`, fullPage: true });
});
