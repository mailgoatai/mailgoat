#!/usr/bin/env node

/**
 * Poll inbox cache for new messages and print detections.
 *
 * Usage:
 *   node monitor-inbox.js [--interval 10000] [--limit 20]
 */

const { execFile } = require('child_process');

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (isHelp) {
  console.log('Usage: node monitor-inbox.js [--interval 10000] [--limit 20]');
  process.exit(0);
}

const intervalMs = Number(argValue('--interval', '10000'));
const limit = Number(argValue('--limit', '20'));
const seen = new Set();

function fetchInbox() {
  return new Promise((resolve, reject) => {
    execFile('mailgoat', ['inbox', 'list', '--limit', String(limit), '--json'], (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) return resolve(parsed);
        if (Array.isArray(parsed.messages)) return resolve(parsed.messages);
        return resolve([]);
      } catch (err) {
        return reject(new Error(`Invalid JSON output: ${err.message}`));
      }
    });
  });
}

async function tick() {
  try {
    const messages = await fetchInbox();
    for (const msg of messages) {
      const id = msg.id || msg.message_id || msg.token;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      console.log(`[new] ${id} | from=${msg.from || msg.fromAddress || 'unknown'} | subject=${msg.subject || '(no subject)'}`);
    }
  } catch (err) {
    console.error('[monitor] fetch failed:', err.message);
  }
}

console.log(`Monitoring inbox every ${intervalMs}ms (limit=${limit}) ...`);
setInterval(tick, intervalMs);
void tick();
