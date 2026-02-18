import * as os from 'os';
import * as path from 'path';
import { describeE2E } from './setup';
import { createE2EClient, firstToken, sendBasic, uniqueSubject } from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { processWebhookPayload } from '../../src/lib/inbox-webhook';
import { cleanupMessages, registerCleanup } from './teardown';

describeE2E('E2E receive + webhook flows', () => {
  const env = getE2EEnv();
  const client = createE2EClient();
  afterAll(async () => {
    await cleanupMessages(client);
  });

  test('read back sent email by recipient token', async () => {
    const subject = uniqueSubject('receive');
    const send = await sendBasic(client, {
      to: [env.receiver],
      subject,
      plain_body: 'Receive path test',
    });

    const token = firstToken(send);
    registerCleanup(token);
    const received = await client.getMessage(token, ['details', 'plain_body', 'status']);
    expect(received.details?.subject).toBe(subject);
    expect(received.status).toBeDefined();
  });

  test('webhook payload gets stored in SQLite cache', () => {
    const { InboxStore } = require('../../src/lib/inbox-store');
    const dbPath = path.join(os.tmpdir(), `mailgoat-e2e-inbox-${Date.now()}.db`);
    const store = new InboxStore(dbPath);
    const messageId = `e2e-webhook-${Date.now()}`;
    processWebhookPayload(store, {
      message_id: messageId,
      details: {
        message_id: messageId,
        mail_from: env.sender,
        rcpt_to: env.receiver,
        subject: 'Webhook E2E',
        timestamp: Math.floor(Date.now() / 1000),
      },
      plain_body: 'webhook body',
    });

    const rows = store.searchMessages('Webhook E2E', 10);
    expect(rows.some((row: { id: string }) => row.id === messageId)).toBe(true);
    store.close();
  });

  test('marking message as read updates cache state', () => {
    const { InboxStore } = require('../../src/lib/inbox-store');
    const dbPath = path.join(os.tmpdir(), `mailgoat-e2e-inbox-${Date.now()}.db`);
    const store = new InboxStore(dbPath);
    const messageId = `e2e-read-${Date.now()}`;
    processWebhookPayload(store, {
      message_id: messageId,
      details: {
        message_id: messageId,
        mail_from: env.sender,
        rcpt_to: env.receiver,
        subject: 'Read Status E2E',
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    expect(store.markAsRead(messageId)).toBe(true);
    const unread = store.listMessages({ unread: true });
    expect(unread.some((row: { id: string }) => row.id === messageId)).toBe(false);
    store.close();
  });
});
