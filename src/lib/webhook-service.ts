import * as crypto from 'crypto';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { IncomingMessageRecord, InboxStore, WebhookEventRecord } from './inbox-store';
import { parseWebhookPayload } from './inbox-webhook';

export const WEBHOOK_EVENT_TYPES = [
  'MessageSent',
  'MessageDelivered',
  'MessageBounced',
  'MessageReceived',
] as const;

type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
type Handler = (event: any) => Promise<any>;

export interface ProcessWebhookOptions {
  handlersDir?: string;
  logPath?: string;
  maxRetries?: number;
}

export interface ProcessWebhookResult {
  eventId: string;
  accepted: boolean;
  type: string;
  handlerStatus: 'success' | 'failed' | 'pending';
  handlerResults: Array<{
    file: string;
    status: 'success' | 'failed';
    result?: any;
    error?: string;
  }>;
}

export function getDefaultHandlersDir(): string {
  return path.join(os.homedir(), '.mailgoat', 'handlers');
}

export function getDefaultWebhookLogPath(): string {
  return path.join(os.homedir(), '.mailgoat', 'webhook-events.log');
}

export function getDefaultWebhookPidPath(): string {
  return path.join(os.homedir(), '.mailgoat', 'webhook.pid');
}

function normalizeType(input: unknown): string {
  const value = String(input || '').trim();
  if (!value) return 'unknown';
  return value;
}

function getSignatureCandidates(headers: Record<string, string | string[] | undefined>): string[] {
  const keys = ['x-postal-signature', 'x-webhook-signature', 'x-signature'];
  const candidates: string[] = [];
  for (const key of keys) {
    const raw = headers[key];
    if (Array.isArray(raw)) {
      candidates.push(...raw);
    } else if (raw) {
      candidates.push(raw);
    }
  }
  return candidates;
}

function normalizeSignature(sig: string): string {
  return sig.includes('=') ? sig.split('=').slice(1).join('=') : sig;
}

export function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
  secret?: string
): boolean {
  if (!secret) return true;
  const signatures = getSignatureCandidates(headers).map(normalizeSignature);
  if (signatures.length === 0) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signatures.some((actual) => {
    const lhs = Buffer.from(actual, 'utf8');
    const rhs = Buffer.from(expected, 'utf8');
    return lhs.length === rhs.length && crypto.timingSafeEqual(lhs, rhs);
  });
}

async function appendLog(logPath: string, record: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  await fsp.appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf8');
}

function toEventId(payload: any): string {
  return String(
    payload?.event_id ||
      payload?.id ||
      payload?.message_id ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function toMessageId(payload: any): string | undefined {
  return payload?.message_id || payload?.message?.message_id || payload?.details?.message_id;
}

function eventTypeToFilename(type: string): string {
  return (
    'on-' +
    type
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase() +
    '.js'
  );
}

async function runWithRetry(handler: Handler, event: any, maxRetries: number): Promise<any> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await handler(event);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

async function loadMatchingHandlers(handlersDir: string, eventType: string) {
  if (!fs.existsSync(handlersDir)) return [];
  const files = await fsp.readdir(handlersDir);
  const expected = eventTypeToFilename(eventType);
  const selected = files.filter((file) => file === expected || file === 'on-event.js');
  return selected.map((file) => ({
    file,
    handlerPath: path.join(handlersDir, file),
  }));
}

export async function processWebhookEvent(
  store: InboxStore,
  payload: any,
  options: ProcessWebhookOptions = {}
): Promise<ProcessWebhookResult> {
  const eventId = toEventId(payload);
  const type = normalizeType(payload?.event || payload?.type);
  const messageId = toMessageId(payload);
  const handlersDir = options.handlersDir || getDefaultHandlersDir();
  const logPath = options.logPath || getDefaultWebhookLogPath();
  const maxRetries = options.maxRetries ?? 3;

  const eventRecord: WebhookEventRecord = {
    id: eventId,
    type,
    messageId,
    payload,
    receivedAt: new Date().toISOString(),
    handlerStatus: 'pending',
  };
  store.saveWebhookEvent(eventRecord);

  if (type === 'MessageReceived') {
    const message: IncomingMessageRecord = parseWebhookPayload(payload);
    store.upsertMessage(message);
  }

  const handlers = await loadMatchingHandlers(handlersDir, type);
  const handlerResults: ProcessWebhookResult['handlerResults'] = [];

  for (const { file, handlerPath } of handlers) {
    try {
      delete require.cache[require.resolve(handlerPath)];
      const mod = require(handlerPath);
      const fn: Handler = mod.default || mod;
      if (typeof fn !== 'function') {
        throw new Error(`Handler ${file} does not export a function`);
      }
      const result = await runWithRetry(fn, payload, maxRetries);
      handlerResults.push({ file, status: 'success', result });
    } catch (error: any) {
      handlerResults.push({
        file,
        status: 'failed',
        error: error?.message || String(error),
      });
    }
  }

  const failed = handlerResults.filter((h) => h.status === 'failed');
  const updated: WebhookEventRecord = {
    ...eventRecord,
    handlerStatus: failed.length > 0 ? 'failed' : 'success',
    handlerResult: handlerResults,
    error: failed.length > 0 ? failed.map((f) => `${f.file}: ${f.error}`).join('; ') : undefined,
  };
  store.saveWebhookEvent(updated);

  await appendLog(logPath, {
    timestamp: new Date().toISOString(),
    eventId,
    type,
    messageId,
    handlerStatus: updated.handlerStatus,
    failures: failed.length,
  });

  return {
    eventId,
    accepted: WEBHOOK_EVENT_TYPES.includes(type as WebhookEventType),
    type,
    handlerStatus: updated.handlerStatus,
    handlerResults,
  };
}

export async function replayWebhookEvent(
  store: InboxStore,
  eventId: string,
  options: ProcessWebhookOptions = {}
): Promise<ProcessWebhookResult> {
  const existing = store.getWebhookEventById(eventId);
  if (!existing) {
    throw new Error(`Event not found: ${eventId}`);
  }
  return processWebhookEvent(store, existing.payload, options);
}

export async function tailWebhookLogs(
  logPath: string,
  onLine: (line: string) => void
): Promise<void> {
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  if (!fs.existsSync(logPath)) {
    await fsp.writeFile(logPath, '', 'utf8');
  }
  let position = fs.statSync(logPath).size;
  fs.watch(logPath, async (eventType) => {
    if (eventType !== 'change') return;
    const stat = await fsp.stat(logPath);
    if (stat.size <= position) return;
    const stream = fs.createReadStream(logPath, { start: position, end: stat.size });
    let chunk = '';
    stream.on('data', (data) => {
      chunk += String(data);
    });
    stream.on('end', () => {
      position = stat.size;
      for (const line of chunk.split('\n').filter(Boolean)) {
        onLine(line);
      }
    });
  });
}
