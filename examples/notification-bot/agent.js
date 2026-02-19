#!/usr/bin/env node
/**
 * Notification bot example.
 * Forwards important inbox emails to Slack/Discord webhooks.
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const POLL_SECONDS = Number(process.env.POLL_SECONDS || 120);
const STATE_FILE = (process.env.STATE_FILE || path.join(os.homedir(), '.mailgoat-notify-state.json')).replace('~', os.homedir());
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const IMPORTANT_KEYWORDS = (process.env.IMPORTANT_KEYWORDS || 'urgent,security,incident,payment').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

async function runMailgoat(args) {
  const { stdout } = await execFileAsync('mailgoat', [...args, '--json']);
  return stdout?.trim() ? JSON.parse(stdout) : null;
}

async function loadState() {
  try {
    return new Set(JSON.parse(await fs.readFile(STATE_FILE, 'utf8')).processed || []);
  } catch {
    return new Set();
  }
}

async function saveState(processed) {
  await fs.writeFile(STATE_FILE, `${JSON.stringify({ processed: [...processed].sort() }, null, 2)}\n`, 'utf8');
}

function isImportant(message) {
  const subject = String(message.subject || '').toLowerCase();
  const body = String(message.body || '').toLowerCase();
  const status = String(message.status || '').toLowerCase();

  if (status === 'failed' || status === 'bounced') return true;
  return IMPORTANT_KEYWORDS.some((kw) => subject.includes(kw) || body.includes(kw));
}

function buildText(message) {
  return [
    '📬 *Important MailGoat Message*',
    `From: ${message.from || '(unknown)'}`,
    `Subject: ${message.subject || '(no subject)'}`,
    `Status: ${message.status || 'unknown'}`,
    `Date: ${message.timestamp || 'n/a'}`,
    '',
    `Preview: ${String(message.body || '').replace(/\s+/g, ' ').slice(0, 240) || '(empty)'}`,
  ].join('\n');
}

async function postSlack(text) {
  if (!SLACK_WEBHOOK_URL) return;
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

async function postDiscord(text) {
  if (!DISCORD_WEBHOOK_URL) return;
  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text }),
  });
}

async function tick() {
  const processed = await loadState();
  const inbox = await runMailgoat(['inbox', 'list', '--limit', '50']);

  if (!Array.isArray(inbox)) return;

  for (const row of inbox) {
    const id = String(row.id || '').trim();
    if (!id || processed.has(id)) continue;

    const message = await runMailgoat(['read', id]);
    if (!message) {
      processed.add(id);
      continue;
    }

    if (isImportant(message)) {
      const text = buildText(message);
      await Promise.all([postSlack(text), postDiscord(text)]);
      console.log(`Forwarded important message ${id}`);
    }

    processed.add(id);
  }

  await saveState(processed);
}

async function main() {
  console.log(`Notification bot running. Poll interval=${POLL_SECONDS}s`);
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error('Tick failed:', err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_SECONDS * 1000));
  }
}

main();
