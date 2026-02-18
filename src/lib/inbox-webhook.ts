import { IncomingMessageRecord, InboxStore } from './inbox-store';

export function parseWebhookPayload(payload: any): IncomingMessageRecord {
  const details = payload?.details ?? payload?.message ?? payload;

  const id =
    payload?.message_id ||
    details?.message_id ||
    payload?.id ||
    details?.id ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const from =
    details?.mail_from || details?.from || payload?.from || payload?.mail_from || 'unknown@unknown';

  const toValue = details?.rcpt_to || details?.to || payload?.to || payload?.rcpt_to || [];
  const to = Array.isArray(toValue)
    ? toValue.map((value) => String(value))
    : String(toValue)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  const subject = details?.subject || payload?.subject || '';

  const timestampRaw =
    payload?.timestamp ||
    details?.timestamp ||
    details?.received_at ||
    payload?.received_at ||
    new Date().toISOString();

  const timestamp =
    typeof timestampRaw === 'number'
      ? new Date(timestampRaw * 1000).toISOString()
      : new Date(timestampRaw).toISOString();

  const snippet = payload?.plain_body || payload?.snippet || details?.snippet || '';

  return {
    id: String(id),
    from: String(from),
    to,
    subject: String(subject),
    timestamp,
    snippet: snippet ? String(snippet) : undefined,
  };
}

export function processWebhookPayload(store: InboxStore, payload: any): IncomingMessageRecord {
  const message = parseWebhookPayload(payload);
  store.upsertMessage(message);
  return message;
}
