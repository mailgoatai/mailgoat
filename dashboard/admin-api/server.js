const express = require('express');
const { query, closePool, createPool } = require('./db');
const { decodeBody } = require('./mime');

const app = express();
const port = Number(process.env.ADMIN_API_PORT || 8787);

app.use(express.json());

function ok(res, data) {
  return res.json({ ok: true, data });
}

function fail(res, status, code, message, details) {
  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function asUnixSeconds(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoFromUnix(value) {
  const ts = asUnixSeconds(value);
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function getRouteStatusColumn() {
  const rows = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'routes'`
  );
  const names = new Set(rows.map((r) => String(r.column_name)));
  if (names.has('status')) return 'status';
  if (names.has('disabled')) return 'disabled';
  if (names.has('is_active')) return 'is_active';
  return null;
}

async function getRouteAddressColumn() {
  const rows = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'routes'`
  );
  const names = new Set(rows.map((r) => String(r.column_name)));
  const candidates = ['name', 'route', 'address', 'email', 'rcpt_to'];
  return candidates.find((c) => names.has(c)) || null;
}

async function getActiveRoutesCount() {
  if (!(await tableExists('routes'))) return 0;

  const statusColumn = await getRouteStatusColumn();
  if (!statusColumn) {
    const rows = await query('SELECT COUNT(*) AS count FROM routes');
    return Number(rows[0]?.count || 0);
  }

  if (statusColumn === 'status') {
    const rows = await query(
      "SELECT COUNT(*) AS count FROM routes WHERE LOWER(status) = 'active'"
    );
    return Number(rows[0]?.count || 0);
  }

  if (statusColumn === 'disabled') {
    const rows = await query('SELECT COUNT(*) AS count FROM routes WHERE disabled = 0');
    return Number(rows[0]?.count || 0);
  }

  const rows = await query('SELECT COUNT(*) AS count FROM routes WHERE is_active = 1');
  return Number(rows[0]?.count || 0);
}

async function getRawTables() {
  const rows = await query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name LIKE 'raw-%'
     ORDER BY table_name DESC`
  );
  return rows
    .map((r) => String(r.table_name))
    .filter((t) => /^raw-\d{4}-\d{2}-\d{2}$/.test(t));
}

async function findRawBody(rawBodyId) {
  if (!rawBodyId) return null;
  const rawTables = await getRawTables();
  for (const table of rawTables) {
    const rows = await query(
      `SELECT CONVERT(data USING utf8mb4) AS body
       FROM \`${table}\`
       WHERE id = ?
       LIMIT 1`,
      [rawBodyId]
    );
    if (rows.length > 0 && rows[0].body != null) {
      return String(rows[0].body);
    }
  }
  return null;
}

app.get('/api/admin/stats/overview', async (_req, res, next) => {
  try {
    const totals = await query(
      `SELECT scope, COUNT(*) AS count
       FROM messages
       GROUP BY scope`
    );
    const last24h = await query(
      `SELECT scope, COUNT(*) AS count
       FROM messages
       WHERE timestamp > UNIX_TIMESTAMP() - 86400
       GROUP BY scope`
    );
    const last7d = await query(
      `SELECT scope, COUNT(*) AS count
       FROM messages
       WHERE timestamp > UNIX_TIMESTAMP() - 604800
       GROUP BY scope`
    );

    const byScope = (rows) =>
      rows.reduce(
        (acc, row) => {
          acc[String(row.scope)] = Number(row.count || 0);
          return acc;
        },
        { outgoing: 0, incoming: 0 }
      );

    const totalByScope = byScope(totals);
    const dayByScope = byScope(last24h);
    const weekByScope = byScope(last7d);
    const activeRoutes = await getActiveRoutesCount();

    return ok(res, {
      totals: {
        sent: totalByScope.outgoing,
        received: totalByScope.incoming,
      },
      windows: {
        last24h: {
          total: dayByScope.outgoing + dayByScope.incoming,
          sent: dayByScope.outgoing,
          received: dayByScope.incoming,
        },
        last7d: {
          total: weekByScope.outgoing + weekByScope.incoming,
          sent: weekByScope.outgoing,
          received: weekByScope.incoming,
        },
      },
      activeRoutes,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/inboxes', async (_req, res, next) => {
  try {
    const stats = await query(
      `SELECT rcpt_to,
              COUNT(*) AS total_received,
              MAX(timestamp) AS last_received
       FROM messages
       WHERE scope = 'incoming'
         AND rcpt_to IS NOT NULL
         AND rcpt_to <> ''
       GROUP BY rcpt_to
       ORDER BY total_received DESC`
    );

    const statMap = new Map(
      stats.map((r) => [
        String(r.rcpt_to),
        {
          totalReceived: Number(r.total_received || 0),
          lastReceivedTimestamp: asUnixSeconds(r.last_received),
        },
      ])
    );

    const allNames = new Set(statMap.keys());
    let routeStatusColumn = null;

    if (await tableExists('routes')) {
      const nameColumn = await getRouteAddressColumn();
      routeStatusColumn = await getRouteStatusColumn();
      if (nameColumn) {
        const routes = await query(`SELECT \`${nameColumn}\` AS inbox FROM routes`);
        for (const r of routes) {
          if (r.inbox) allNames.add(String(r.inbox));
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const activeThreshold = 30 * 24 * 60 * 60;

    const inboxes = Array.from(allNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => {
        const stat = statMap.get(name) || {
          totalReceived: 0,
          lastReceivedTimestamp: null,
        };

        let status = 'inactive';
        if (routeStatusColumn === 'status') {
          status = stat.totalReceived > 0 ? 'active' : 'inactive';
        } else if (stat.lastReceivedTimestamp && now - stat.lastReceivedTimestamp <= activeThreshold) {
          status = 'active';
        }

        return {
          name,
          totalReceived: stat.totalReceived,
          lastReceived: toIsoFromUnix(stat.lastReceivedTimestamp),
          status,
        };
      });

    return ok(res, { inboxes, total: inboxes.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/inboxes/:name/messages', async (req, res, next) => {
  try {
    const name = String(req.params.name || '').trim();
    if (!name) {
      return fail(res, 400, 'INVALID_INBOX', 'Inbox name is required');
    }

    const rawLimit = Number(req.query.limit || 50);
    const rawOffset = Number(req.query.offset || 0);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    const messages = await query(
      `SELECT id, mail_from, subject, timestamp, status
       FROM messages
       WHERE rcpt_to = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [name, limit, offset]
    );

    return ok(res, {
      inbox: name,
      limit,
      offset,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.mail_from,
        subject: m.subject,
        timestamp: toIsoFromUnix(m.timestamp),
        status: m.status,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/messages/:id', async (req, res, next) => {
  try {
    const messageId = String(req.params.id || '').trim();
    if (!messageId) {
      return fail(res, 400, 'INVALID_MESSAGE_ID', 'Message id is required');
    }

    const rows = await query(
      `SELECT *
       FROM messages
       WHERE id = ?
       LIMIT 1`,
      [messageId]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'MESSAGE_NOT_FOUND', `Message ${messageId} not found`);
    }

    const message = rows[0];
    const rawBody = await findRawBody(message.raw_body_id);
    const decoded = decodeBody(rawBody);

    return ok(res, {
      id: message.id,
      scope: message.scope,
      from: message.mail_from,
      to: message.rcpt_to,
      subject: message.subject,
      status: message.status,
      timestamp: toIsoFromUnix(message.timestamp),
      headers: decoded.headers,
      textBody: decoded.textBody,
      htmlBody: decoded.htmlBody,
      rawBody: decoded.rawBody,
      rawBodyId: message.raw_body_id || null,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats/by-inbox', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT rcpt_to, scope, COUNT(*) AS count
       FROM messages
       WHERE rcpt_to IS NOT NULL
         AND rcpt_to <> ''
       GROUP BY rcpt_to, scope
       ORDER BY rcpt_to ASC`
    );

    const totalIncoming = rows
      .filter((r) => String(r.scope) === 'incoming')
      .reduce((sum, r) => sum + Number(r.count || 0), 0);

    const inboxMap = new Map();
    for (const row of rows) {
      const name = String(row.rcpt_to);
      if (!inboxMap.has(name)) {
        inboxMap.set(name, { name, incoming: 0, outgoing: 0 });
      }
      const ref = inboxMap.get(name);
      const value = Number(row.count || 0);
      if (String(row.scope) === 'incoming') ref.incoming += value;
      if (String(row.scope) === 'outgoing') ref.outgoing += value;
    }

    const inboxes = Array.from(inboxMap.values())
      .map((row) => {
        const total = row.incoming + row.outgoing;
        const incomingPct = totalIncoming > 0 ? (row.incoming / totalIncoming) * 100 : 0;
        return {
          name: row.name,
          incoming: row.incoming,
          outgoing: row.outgoing,
          total,
          incomingPercentage: Number(incomingPct.toFixed(2)),
        };
      })
      .sort((a, b) => b.total - a.total);

    return ok(res, {
      totalIncomingMessages: totalIncoming,
      inboxes,
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));

app.use((error, _req, res, _next) => {
  const message = error && error.message ? error.message : 'Unknown server error';
  return fail(res, 500, 'DB_QUERY_FAILED', message);
});

const server = app.listen(port, async () => {
  try {
    createPool();
    await query('SELECT 1');
    // eslint-disable-next-line no-console
    console.log(`Admin API listening on :${port}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Admin API started on :${port} (DB check failed: ${error.message})`);
  }
});

function shutdown() {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
