const APP = {
  apiBase: (window.localStorage.getItem('mailgoat_admin_api_base') || '').trim(),
  pageSize: 50,
  route: { view: 'dashboard', inbox: null },
  inboxStatsMap: new Map(),
  messages: [],
  filteredMessages: [],
  selectedMessageId: null,
  selectedMessage: null,
  viewerMode: 'text',
  showHeaders: false,
  rawOpen: false,
  loading: false,
  error: null,
  filters: {
    search: '',
    status: 'all',
    date: 'all',
    page: 1,
  },
};

const STATUS_UI = {
  delivered: { icon: '✓', label: 'Delivered', className: 'status-delivered' },
  sent: { icon: '✓', label: 'Delivered', className: 'status-delivered' },
  pending: { icon: '⏳', label: 'Pending', className: 'status-pending' },
  queued: { icon: '⏳', label: 'Pending', className: 'status-pending' },
  failed: { icon: '✗', label: 'Failed', className: 'status-failed' },
  bounced: { icon: '✗', label: 'Failed', className: 'status-failed' },
};

function apiUrl(path) {
  return `${APP.apiBase}${path}`;
}

function setSubtitle(text) {
  document.getElementById('routeSubtitle').textContent = text;
}

function setApiBaseText() {
  document.getElementById('apiBase').textContent = APP.apiBase || '(same origin)';
}

async function fetchJson(path) {
  const res = await fetch(apiUrl(path));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const message = data?.error?.message || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data.data || data;
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str || '').replace(/[&<>"']/g, (m) => map[m]);
}

function normalizeInboxAddress(name) {
  return String(name || '').includes('@') ? String(name) : `${name}@mailgoat.ai`;
}

function relativeTime(dateString) {
  if (!dateString) return 'N/A';
  const now = Date.now();
  const value = new Date(dateString).getTime();
  if (!Number.isFinite(value)) return 'N/A';
  const diff = Math.max(0, Math.floor((now - value) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (!Number.isFinite(d.getTime())) return 'N/A';
  return `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function getStatusUI(status) {
  const normalized = String(status || '').toLowerCase();
  return STATUS_UI[normalized] || { icon: '?', label: normalized || 'unknown', className: 'status-pending' };
}

function dateFilterMatches(dateIso, windowName) {
  if (windowName === 'all') return true;
  if (!dateIso) return false;
  const ts = new Date(dateIso).getTime();
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  const days = {
    d1: 1,
    d7: 7,
    d30: 30,
  }[windowName];
  if (!days) return true;
  return now - ts <= days * 24 * 60 * 60 * 1000;
}

function parseRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/admin\/inbox\/([^/]+)\/?$/);
  if (match) {
    return {
      view: 'inbox',
      inbox: decodeURIComponent(match[1]),
    };
  }

  return { view: 'dashboard', inbox: null };
}

function goTo(path) {
  window.history.pushState({}, '', path);
  APP.route = parseRoute();
  render();
  loadCurrentView();
}

function renderLoading() {
  const app = document.getElementById('app');
  app.innerHTML = '<section class="panel loading">Loading...</section>';
}

function renderError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `<section class="panel error"><h2>Unable to load data</h2><p>${escapeHtml(message)}</p></section>`;
}

async function ensureInboxStats() {
  if (APP.inboxStatsMap.size > 0) return;
  try {
    const data = await fetchJson('/api/admin/stats/by-inbox');
    const list = Array.isArray(data.inboxes) ? data.inboxes : [];
    APP.inboxStatsMap = new Map(list.map((i) => [String(i.name), i]));
  } catch (error) {
    APP.inboxStatsMap = new Map();
  }
}

async function loadDashboardData() {
  APP.loading = true;
  APP.error = null;
  renderLoading();

  try {
    const data = await fetchJson('/api/admin/inboxes');
    APP.dashboardInboxes = Array.isArray(data.inboxes) ? data.inboxes : [];
    APP.loading = false;
    renderDashboard();
  } catch (error) {
    APP.loading = false;
    APP.error = error;
    renderError(error.message);
  }
}

function renderDashboard() {
  setSubtitle('Inbox Overview');
  const app = document.getElementById('app');
  const rows = (APP.dashboardInboxes || [])
    .map(
      (inbox) => `
      <tr>
        <td><a class="link-btn" href="/admin/inbox/${encodeURIComponent(inbox.name)}" data-nav>${escapeHtml(inbox.name)}</a></td>
        <td>${Number(inbox.totalReceived || 0)}</td>
        <td>${escapeHtml(inbox.status || 'unknown')}</td>
        <td>${escapeHtml(relativeTime(inbox.lastReceived))}</td>
      </tr>`
    )
    .join('');

  app.innerHTML = `
    <section class="panel">
      <h2>Inboxes</h2>
      ${rows
        ? `<table class="inbox-list"><thead><tr><th>Name</th><th>Total Received</th><th>Status</th><th>Last Activity</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<div class="empty-state"><h3>No inboxes yet</h3><p>No inbox records are currently available.</p></div>`}
    </section>
  `;

  attachNavHandlers();
}

function applyFilters() {
  const search = APP.filters.search.trim().toLowerCase();
  APP.filteredMessages = APP.messages.filter((msg) => {
    const subject = String(msg.subject || '').toLowerCase();
    const from = String(msg.from || '').toLowerCase();
    const status = String(msg.status || '').toLowerCase();

    if (search && !subject.includes(search) && !from.includes(search)) return false;
    if (APP.filters.status !== 'all' && status !== APP.filters.status) return false;
    if (!dateFilterMatches(msg.timestamp, APP.filters.date)) return false;
    return true;
  });

  APP.filteredMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const totalPages = Math.max(1, Math.ceil(APP.filteredMessages.length / APP.pageSize));
  if (APP.filters.page > totalPages) APP.filters.page = totalPages;
}

function currentPageItems() {
  const start = (APP.filters.page - 1) * APP.pageSize;
  return APP.filteredMessages.slice(start, start + APP.pageSize);
}

function renderInboxView() {
  const inbox = APP.route.inbox;
  setSubtitle(`Inbox: ${normalizeInboxAddress(inbox)}`);

  const stats = APP.inboxStatsMap.get(inbox) || { incoming: APP.messages.length, outgoing: 0 };
  const lastActivity = APP.messages[0]?.timestamp || null;

  applyFilters();
  const totalPages = Math.max(1, Math.ceil(APP.filteredMessages.length / APP.pageSize));
  const rows = currentPageItems();

  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="panel header-card">
      <a href="/admin" class="link-btn" data-nav>← Back to Dashboard</a>
      <h2>Inbox: ${escapeHtml(normalizeInboxAddress(inbox))}</h2>
      <div class="meta-row">
        <span>Total Messages: ${Number(stats.incoming || 0)} received, ${Number(stats.outgoing || 0)} sent</span>
        <span>Last Activity: ${escapeHtml(relativeTime(lastActivity))}</span>
      </div>
    </section>

    <section class="panel">
      <div class="filters">
        <input id="searchInput" type="text" placeholder="Search subject or sender" value="${escapeHtml(APP.filters.search)}" />
        <select id="statusFilter">
          <option value="all" ${APP.filters.status === 'all' ? 'selected' : ''}>Status: All</option>
          <option value="delivered" ${APP.filters.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="pending" ${APP.filters.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="failed" ${APP.filters.status === 'failed' ? 'selected' : ''}>Failed</option>
        </select>
        <select id="dateFilter">
          <option value="all" ${APP.filters.date === 'all' ? 'selected' : ''}>Date: All</option>
          <option value="d1" ${APP.filters.date === 'd1' ? 'selected' : ''}>Last 24h</option>
          <option value="d7" ${APP.filters.date === 'd7' ? 'selected' : ''}>Last 7d</option>
          <option value="d30" ${APP.filters.date === 'd30' ? 'selected' : ''}>Last 30d</option>
        </select>
      </div>
    </section>

    ${APP.messages.length === 0 ? `
      <section class="panel empty-state">
        <h3>No messages yet</h3>
        <p>This inbox hasn't received any emails.</p>
        <p>Send a test email to ${escapeHtml(normalizeInboxAddress(inbox))}</p>
      </section>
    ` : `
      <section class="layout">
        <section class="panel">
          <table class="message-list">
            <thead>
              <tr>
                <th>[ ]</th>
                <th>From</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((m) => {
                  const ui = getStatusUI(m.status);
                  const selectedClass = APP.selectedMessageId === m.id ? 'selected' : '';
                  return `
                  <tr data-message-id="${escapeHtml(m.id)}" class="${selectedClass}">
                    <td>[ ]<span class="unread-tag">unread</span></td>
                    <td>${escapeHtml(m.from || '(unknown sender)')}</td>
                    <td class="subject-line" title="${escapeHtml(m.subject || '(no subject)')}">${escapeHtml(m.subject || '(no subject)')}</td>
                    <td>${escapeHtml(relativeTime(m.timestamp))}</td>
                    <td><span class="status-pill ${ui.className}">${ui.icon} ${ui.label}</span></td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>

          <div class="pagination">
            <span>Page ${APP.filters.page} / ${totalPages} (${APP.filteredMessages.length} messages)</span>
            <div class="group">
              <button id="prevPage" ${APP.filters.page <= 1 ? 'disabled' : ''}>Prev</button>
              <button id="nextPage" ${APP.filters.page >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
          </div>
        </section>

        <section class="panel viewer">
          ${renderViewerHTML()}
        </section>
      </section>
    `}
  `;

  attachInboxHandlers();
  attachNavHandlers();
}

function renderViewerHTML() {
  if (APP.selectedMessageId && !APP.selectedMessage) {
    return '<div class="loading">Loading message...</div>';
  }

  if (!APP.selectedMessage) {
    return '<div class="empty-state"><h3>Select a message</h3><p>Choose a row to view full content.</p></div>';
  }

  const m = APP.selectedMessage;
  const status = getStatusUI(m.status);
  const body = renderBodyByMode(m);
  const headersRows = Object.entries(m.headers || {})
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');

  return `
    <h3>Subject: ${escapeHtml(m.subject || '(no subject)')}</h3>
    <div class="viewer-meta">
      <div>From: ${escapeHtml(m.from || '(unknown sender)')}</div>
      <div>To: ${escapeHtml(m.to || '(unknown recipient)')}</div>
      <div>Date: ${escapeHtml(fmtDate(m.timestamp))}</div>
      <div>Status: <span class="status-pill ${status.className}">${status.icon} ${status.label}</span></div>
    </div>

    <div class="viewer-toolbar">
      <button data-view-mode="text" ${APP.viewerMode === 'text' ? 'class="primary"' : ''}>Text</button>
      <button data-view-mode="html" ${APP.viewerMode === 'html' ? 'class="primary"' : ''}>HTML</button>
      <button data-view-mode="raw" ${APP.viewerMode === 'raw' ? 'class="primary"' : ''}>View Raw</button>
      <button id="toggleHeaders">${APP.showHeaders ? 'Hide Headers' : 'Show Headers'}</button>
      <button id="closeViewer">Close</button>
    </div>

    <div class="viewer-body">${body}</div>

    ${APP.showHeaders ? `
      <div class="panel" style="margin-top:8px;">
        <h4>Headers</h4>
        <table class="inbox-list"><tbody>${headersRows || '<tr><td colspan="2">No headers</td></tr>'}</tbody></table>
      </div>
    ` : ''}
  `;
}

function decodeQuotedPrintable(input) {
  if (!input) return '';
  return input
    .replace(/=\r?\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBase64(input) {
  if (!input) return '';
  try {
    return decodeURIComponent(escape(window.atob(String(input).replace(/\s+/g, ''))));
  } catch (_e) {
    return input;
  }
}

function parseMultipart(rawBody, headers) {
  const contentType = String(headers?.['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundaryMatch || !rawBody) return { text: null, html: null };

  const boundary = boundaryMatch[1];
  const pieces = String(rawBody).split(`--${boundary}`);
  let text = null;
  let html = null;

  for (const piece of pieces) {
    if (!piece || piece.trim() === '--') continue;
    const segment = piece.replace(/^\r?\n/, '');
    const splitToken = segment.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n';
    const idx = segment.indexOf(splitToken);
    if (idx < 0) continue;

    const rawHeaders = segment.slice(0, idx);
    const body = segment.slice(idx + splitToken.length).trim();

    const partHeaders = {};
    for (const line of rawHeaders.split(/\r?\n/)) {
      const colon = line.indexOf(':');
      if (colon > 0) {
        partHeaders[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
      }
    }

    const partType = String(partHeaders['content-type'] || '').toLowerCase();
    const transfer = String(partHeaders['content-transfer-encoding'] || '').toLowerCase();

    let decoded = body;
    if (transfer.includes('quoted-printable')) decoded = decodeQuotedPrintable(decoded);
    if (transfer.includes('base64')) decoded = decodeBase64(decoded);

    if (partType.includes('text/plain') && !text) text = decoded;
    if (partType.includes('text/html') && !html) html = decoded;
  }

  return { text, html };
}

function parseEmailBody(message) {
  if (message.textBody || message.htmlBody) {
    return {
      text: message.textBody || null,
      html: message.htmlBody || null,
    };
  }

  const parsed = parseMultipart(message.rawBody || '', message.headers || {});
  if (parsed.text || parsed.html) return parsed;

  return {
    text: message.rawBody || null,
    html: null,
  };
}

function sanitizeHtml(html) {
  if (!html) return '<em>No HTML body</em>';
  const cleaned = window.DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'text/html');
  doc.querySelectorAll('a').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return doc.body.innerHTML;
}

function renderBodyByMode(message) {
  const parsed = parseEmailBody(message);

  if (APP.viewerMode === 'raw') {
    return `<pre>${escapeHtml(message.rawBody || '(no raw body)')}</pre>`;
  }

  if (APP.viewerMode === 'html') {
    return parsed.html ? sanitizeHtml(parsed.html) : '<em>No HTML part available.</em>';
  }

  return `<pre>${escapeHtml(parsed.text || '(no text body)')}</pre>`;
}

async function loadMessageDetail(messageId) {
  APP.selectedMessageId = messageId;
  APP.selectedMessage = null;
  renderInboxView();

  try {
    const detail = await fetchJson(`/api/admin/messages/${encodeURIComponent(messageId)}`);
    APP.selectedMessage = detail;
    APP.viewerMode = detail.textBody ? 'text' : detail.htmlBody ? 'html' : 'raw';
    APP.showHeaders = false;
    renderInboxView();
  } catch (error) {
    APP.selectedMessage = {
      id: messageId,
      subject: 'Failed to load message',
      from: '',
      to: '',
      status: 'failed',
      timestamp: new Date().toISOString(),
      headers: {},
      rawBody: `Error: ${error.message}`,
      textBody: `Error: ${error.message}`,
      htmlBody: null,
    };
    APP.viewerMode = 'text';
    renderInboxView();
  }
}

async function loadInboxMessages(name) {
  APP.loading = true;
  APP.error = null;
  APP.messages = [];
  APP.selectedMessage = null;
  APP.selectedMessageId = null;
  renderLoading();

  try {
    await ensureInboxStats();
    const response = await fetchJson(`/api/admin/inboxes/${encodeURIComponent(name)}/messages?limit=500&offset=0`);
    APP.messages = Array.isArray(response.messages) ? response.messages : [];
    APP.messages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    APP.loading = false;
    renderInboxView();
  } catch (error) {
    APP.loading = false;
    APP.error = error;
    renderError(error.message);
  }
}

function attachNavHandlers() {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const href = el.getAttribute('href');
      if (href) goTo(href);
    });
  });
}

function attachInboxHandlers() {
  const search = document.getElementById('searchInput');
  const status = document.getElementById('statusFilter');
  const date = document.getElementById('dateFilter');

  if (search) {
    search.addEventListener('input', () => {
      APP.filters.search = search.value;
      APP.filters.page = 1;
      renderInboxView();
    });
  }

  if (status) {
    status.addEventListener('change', () => {
      APP.filters.status = status.value;
      APP.filters.page = 1;
      renderInboxView();
    });
  }

  if (date) {
    date.addEventListener('change', () => {
      APP.filters.date = date.value;
      APP.filters.page = 1;
      renderInboxView();
    });
  }

  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');

  if (prev) {
    prev.addEventListener('click', () => {
      APP.filters.page = Math.max(1, APP.filters.page - 1);
      renderInboxView();
    });
  }

  if (next) {
    next.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(APP.filteredMessages.length / APP.pageSize));
      APP.filters.page = Math.min(totalPages, APP.filters.page + 1);
      renderInboxView();
    });
  }

  document.querySelectorAll('tr[data-message-id]').forEach((row) => {
    row.addEventListener('click', () => loadMessageDetail(row.getAttribute('data-message-id')));
  });

  document.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      APP.viewerMode = btn.getAttribute('data-view-mode');
      renderInboxView();
    });
  });

  const toggleHeaders = document.getElementById('toggleHeaders');
  if (toggleHeaders) {
    toggleHeaders.addEventListener('click', () => {
      APP.showHeaders = !APP.showHeaders;
      renderInboxView();
    });
  }

  const closeViewer = document.getElementById('closeViewer');
  if (closeViewer) {
    closeViewer.addEventListener('click', () => {
      APP.selectedMessage = null;
      APP.selectedMessageId = null;
      renderInboxView();
    });
  }
}

function render() {
  if (APP.route.view === 'dashboard') {
    renderDashboard();
  } else {
    renderInboxView();
  }
}

async function loadCurrentView() {
  if (APP.route.view === 'dashboard') {
    await loadDashboardData();
    return;
  }

  APP.filters.page = 1;
  await loadInboxMessages(APP.route.inbox);
}

window.addEventListener('popstate', async () => {
  APP.route = parseRoute();
  await loadCurrentView();
});

document.addEventListener('DOMContentLoaded', async () => {
  setApiBaseText();
  APP.route = parseRoute();

  if (!window.location.pathname.startsWith('/admin')) {
    window.history.replaceState({}, '', '/admin');
    APP.route = parseRoute();
  }

  await loadCurrentView();
});
