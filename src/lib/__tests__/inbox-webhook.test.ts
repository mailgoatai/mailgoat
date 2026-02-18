import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InboxStore } from '../inbox-store';
import { parseWebhookPayload, processWebhookPayload } from '../inbox-webhook';

function createTempDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-webhook-'));
  return path.join(dir, `${name}.db`);
}

describe('inbox-webhook', () => {
  it('parses postal-like payload format', () => {
    const payload = {
      message_id: 'msg-123',
      details: {
        mail_from: 'sender@example.com',
        rcpt_to: 'agent@example.com',
        subject: 'Hello',
        timestamp: 1763500000,
      },
      plain_body: 'Body snippet',
    };

    const parsed = parseWebhookPayload(payload);

    expect(parsed.id).toBe('msg-123');
    expect(parsed.from).toBe('sender@example.com');
    expect(parsed.to).toEqual(['agent@example.com']);
    expect(parsed.subject).toBe('Hello');
    expect(parsed.snippet).toBe('Body snippet');
  });

  it('stores parsed webhook payload in sqlite cache', () => {
    const dbPath = createTempDbPath('store');
    const store = new InboxStore(dbPath);

    const payload = {
      id: 'msg-456',
      from: 'alerts@example.com',
      to: ['agent@example.com'],
      subject: 'Incident',
      received_at: '2026-02-18T21:00:00.000Z',
      snippet: 'Investigate now',
    };

    processWebhookPayload(store, payload);

    const messages = store.listMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('msg-456');
    expect(messages[0].read).toBe(false);

    store.close();
  });
});
