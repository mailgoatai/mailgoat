const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const OUT_DIR = '/Users/vibe/.opengoat/workspaces/developer-4/mailgoat/docs/images/admin-panel';
const LE = '/Users/vibe/.opengoat/workspaces/lead-engineer/mailgoat';
const DEV2 = '/Users/vibe/.opengoat/workspaces/developer-2/mailgoat/dashboard';

let loginProc;
let dashboardServer;
let inboxServer;

async function annotate(page, labels) {
  await page.evaluate((items) => {
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

async function startServers() {
  loginProc = spawn('node', ['bin/mailgoat.js', 'admin', 'serve', '--host', '127.0.0.1', '--port', '4310'], {
    cwd: LE,
    env: { ...process.env, ADMIN_PASSWORD: 'super-secure-password', SESSION_SECRET: 'super-secret-session-key' },
    stdio: 'ignore',
  });

  const appDash = express();
  appDash.use('/admin', express.static(DEV2));
  appDash.use('/admin/dashboard', express.static(DEV2));
  appDash.get('/admin', (_req, res) => res.sendFile(path.join(DEV2, 'index.html')));
  appDash.get('/admin/dashboard', (_req, res) => res.sendFile(path.join(DEV2, 'index.html')));
  appDash.get('/api/admin/stats/overview', (_req, res) => res.json({
    totalSent: 1420, totalReceived: 2310, last24h: 184, last7d: 1022,
    messagesOverTime: [
      { label: 'Mon', sent: 140, received: 210 }, { label: 'Tue', sent: 170, received: 260 },
      { label: 'Wed', sent: 160, received: 245 }, { label: 'Thu', sent: 190, received: 300 },
      { label: 'Fri', sent: 210, received: 320 },
    ],
    statusBreakdown: { delivered: 3200, pending: 220, failed: 140, bounced: 65 },
  }));
  appDash.get('/api/admin/stats/by-inbox', (_req, res) => res.json({ inboxes: [
    { inbox: 'alerts@mailgoat.ai', sent: 320, received: 860 },
    { inbox: 'ops@mailgoat.ai', sent: 440, received: 520 },
    { inbox: 'billing@mailgoat.ai', sent: 260, received: 470 },
    { inbox: 'support@mailgoat.ai', sent: 400, received: 460 },
  ] }));
  appDash.get('/api/admin/inboxes', (_req, res) => res.json({ inboxes: [
    { id: 'alerts@mailgoat.ai', inbox: 'alerts@mailgoat.ai', totalReceived: 860, lastMessageAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
    { id: 'ops@mailgoat.ai', inbox: 'ops@mailgoat.ai', totalReceived: 520, lastMessageAt: new Date(Date.now() - 34 * 60 * 1000).toISOString() },
    { id: 'billing@mailgoat.ai', inbox: 'billing@mailgoat.ai', totalReceived: 470, lastMessageAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  ] }));
  dashboardServer = await new Promise((resolve) => { const s = appDash.listen(4311, '127.0.0.1', () => resolve(s)); });

  const appInbox = express();
  const dashboardDir = path.join(LE, 'dashboard');
  appInbox.use(express.static(dashboardDir));
  appInbox.get('/admin', (_req, res) => res.sendFile(path.join(dashboardDir, 'index.html')));
  appInbox.get('/admin/inbox/:name', (_req, res) => res.sendFile(path.join(dashboardDir, 'index.html')));
  appInbox.get('/api/admin/stats/by-inbox', (_req, res) => res.json({ inboxes: [{ name: 'alerts@mailgoat.ai', incoming: 128, outgoing: 44 }] }));
  appInbox.get('/api/admin/inboxes', (_req, res) => res.json({ inboxes: [{ name: 'alerts@mailgoat.ai', totalReceived: 128, status: 'active', lastReceived: new Date(Date.now() - 25 * 60 * 1000).toISOString() }] }));
  appInbox.get('/api/admin/inboxes/:name/messages', (_req, res) => res.json({
    inbox: 'alerts@mailgoat.ai', limit: 500, offset: 0,
    messages: [
      { id: 'msg_1001', from: 'infra@acme.ai', subject: 'Delivery latency report', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), status: 'delivered' },
      { id: 'msg_1002', from: 'noreply@billing.example', subject: 'Payment retry notice', timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), status: 'pending' },
      { id: 'msg_1003', from: 'mailer-daemon@example.net', subject: 'Bounce summary', timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), status: 'failed' },
    ],
  }));
  appInbox.get('/api/admin/messages/:id', (req, res) => res.json({
    id: String(req.params.id), from: 'infra@acme.ai', to: 'alerts@mailgoat.ai', subject: 'Delivery latency report',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), status: 'delivered',
    text: 'Hourly summary: p50=210ms, p95=690ms, p99=1.2s.',
    html: '<p><strong>Hourly summary</strong>: p50=210ms, p95=690ms, p99=1.2s.</p>',
    rawBody: 'From: infra@acme.ai\\nTo: alerts@mailgoat.ai\\nSubject: Delivery latency report\\n\\nHourly summary...',
    headers: { 'message-id': '<msg_1001@example>' },
  }));
  inboxServer = await new Promise((resolve) => { const s = appInbox.listen(4312, '127.0.0.1', () => resolve(s)); });

  await new Promise((r) => setTimeout(r, 1200));
}

async function cleanup() {
  if (dashboardServer) await new Promise((r) => dashboardServer.close(r));
  if (inboxServer) await new Promise((r) => inboxServer.close(r));
  if (loginProc) loginProc.kill('SIGTERM');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1540, height: 980 } });
  try {
    await startServers();

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
    await page.waitForTimeout(300);
    await annotate(page, [
      { n: 1, t: 'Search and filter controls', x: '220px', y: '250px', tx: '260px', ty: '250px' },
      { n: 2, t: 'Message list with status icons', x: '220px', y: '380px', tx: '260px', ty: '380px' },
      { n: 3, t: 'Selected message details', x: '980px', y: '380px', tx: '1020px', ty: '380px' },
      { n: 4, t: 'Viewer modes: Text / HTML / Raw', x: '980px', y: '510px', tx: '1020px', ty: '510px' },
    ]);
    await page.screenshot({ path: `${OUT_DIR}/inbox-details-annotated.png`, fullPage: true });
  } finally {
    await browser.close();
    await cleanup();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
