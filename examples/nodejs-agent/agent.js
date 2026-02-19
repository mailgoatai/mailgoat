#!/usr/bin/env node
/**
 * Node.js MailGoat example agent.
 * Polls inbox, parses messages, and sends automated responses.
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const POLL_SECONDS = Number(process.env.POLL_SECONDS || 300);
const STATE_FILE = (process.env.STATE_FILE || path.join(os.homedir(), '.mailgoat-node-agent-state.json')).replace('~', os.homedir());
const RESPONSE_TAG = process.env.RESPONSE_TAG || 'auto-node-agent';

async function runMailgoat(args) {
  const { stdout, stderr } = await execFileAsync('mailgoat', [...args, '--json']);
  if (stderr && stderr.trim()) {
    // mailgoat may print warnings; don't fail on non-fatal stderr.
  }
  return stdout?.trim() ? JSON.parse(stdout) : null;
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const payload = JSON.parse(raw);
    return new Set(payload.processedIds || []);
  } catch {
    return new Set();
  }
}

async function saveState(ids) {
  const payload = { processedIds: [...ids].sort() };
  await fs.writeFile(STATE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function summarizeMessage(message) {
  const body = String(message.body || '').trim().replace(/\s+/g, ' ');
  return body.length > 180 ? `${body.slice(0, 180)}...` : body;
}

function buildReply(message) {
  const from = message.from || 'unknown@local';
  const subject = message.subject || '(no subject)';
  const summary = summarizeMessage(message) || '(empty body)';

  return {
    to: from,
    subject: `Re: ${subject}`,
    body: [
      `Hello ${from},`,
      '',
      'Your email has been processed by the Node.js example agent.',
      `Summary: ${summary}`,
      '',
      'This is an automated response.',
    ].join('\n'),
  };
}

async function processInbox() {
  const state = await loadState();
  const messages = await runMailgoat(['inbox', 'list', '--limit', '50']);

  if (!Array.isArray(messages)) {
    console.error('Unexpected inbox payload (expected array).');
    return;
  }

  for (const row of messages) {
    const id = String(row.id || '').trim();
    if (!id || state.has(id)) continue;

    const message = await runMailgoat(['read', id]);
    if (!message?.from) {
      state.add(id);
      continue;
    }

    const reply = buildReply(message);
    await runMailgoat([
      'send',
      '--to', reply.to,
      '--subject', reply.subject,
      '--body', reply.body,
      '--tag', RESPONSE_TAG,
    ]);

    state.add(id);
    console.log(`Replied to ${reply.to} for ${id}`);
  }

  await saveState(state);
}

async function main() {
  console.log(`Node.js agent started. Poll interval: ${POLL_SECONDS}s`);
  for (;;) {
    try {
      await processInbox();
    } catch (error) {
      console.error('Agent loop error:', error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_SECONDS * 1000));
  }
}

main();
