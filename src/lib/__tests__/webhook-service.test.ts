import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InboxStore } from '../inbox-store';
import { processWebhookEvent, verifyWebhookSignature } from '../webhook-service';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('webhook-service', () => {
  it('verifies HMAC signature', () => {
    const body = JSON.stringify({ event: 'MessageReceived', message_id: 'm1' });
    const secret = 'test-secret';
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const valid = verifyWebhookSignature(
      body,
      { 'x-postal-signature': `sha256=${digest}` },
      secret
    );
    expect(valid).toBe(true);
  });

  it('stores event and executes matching handler', async () => {
    const dir = makeTempDir('mailgoat-wh-');
    const dbPath = path.join(dir, 'messages.db');
    const handlersDir = path.join(dir, 'handlers');
    const logPath = path.join(dir, 'events.log');
    fs.mkdirSync(handlersDir, { recursive: true });
    fs.writeFileSync(
      path.join(handlersDir, 'on-message-received.js'),
      'module.exports = async (event) => ({ ok: true, id: event.message_id });\n',
      'utf8'
    );

    const store = new InboxStore(dbPath);
    const payload = {
      event: 'MessageReceived',
      message_id: 'msg-1',
      message: {
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Hello',
        timestamp: new Date().toISOString(),
      },
    };

    const result = await processWebhookEvent(store, payload, { handlersDir, logPath });
    expect(result.type).toBe('MessageReceived');
    expect(result.handlerStatus).toBe('success');
    expect(result.handlerResults.length).toBe(1);
    expect(store.getWebhookEventById(result.eventId)?.handlerStatus).toBe('success');

    store.close();
  });
});
