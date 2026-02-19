import { describeE2E } from './setup';
import {
  createE2EClient,
  firstToken,
  sendBasic,
  tinyPdfBase64,
  tinyPngBase64,
  uniqueSubject,
} from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { cleanupMessages, registerCleanup } from './teardown';

describeE2E('E2E send flows', () => {
  const env = getE2EEnv();
  const client = createE2EClient();

  afterAll(async () => {
    await cleanupMessages(client);
  });

  test('send simple plain text email', async () => {
    const subject = uniqueSubject('plain');
    const result = await sendBasic(client, {
      to: [env.receiver],
      subject,
      plain_body: 'This is a test email',
    });

    expect(result.message_id).toBeDefined();
    const token = firstToken(result);
    registerCleanup(token);
    const received = await client.getMessage(token, ['details', 'plain_body']);
    expect(received.details?.subject).toBe(subject);
  });

  test('send HTML email', async () => {
    const subject = uniqueSubject('html');
    const result = await sendBasic(client, {
      to: [env.receiver],
      subject,
      html_body: '<h1>Hello E2E</h1><p>HTML body</p>',
    });

    const token = firstToken(result);
    registerCleanup(token);
    const received = await client.getMessage(token, ['details', 'html_body']);
    expect(received.details?.subject).toBe(subject);
  });

  test('send with text attachment', async () => {
    const subject = uniqueSubject('txt-attach');
    const result = await sendBasic(client, {
      to: [env.receiver],
      subject,
      plain_body: 'Attachment test',
      attachments: [
        {
          name: 'note.txt',
          content_type: 'text/plain',
          data: Buffer.from('hello').toString('base64'),
        },
      ],
    });

    const token = firstToken(result);
    registerCleanup(token);
    expect(token).toBeTruthy();
  });

  test('send with image attachment', async () => {
    const result = await sendBasic(client, {
      to: [env.receiver],
      subject: uniqueSubject('img-attach'),
      plain_body: 'Image attachment',
      attachments: [{ name: 'pixel.png', content_type: 'image/png', data: tinyPngBase64() }],
    });

    const token = firstToken(result);
    registerCleanup(token);
    expect(token).toBeTruthy();
  });

  test('send with PDF attachment', async () => {
    const result = await sendBasic(client, {
      to: [env.receiver],
      subject: uniqueSubject('pdf-attach'),
      plain_body: 'PDF attachment',
      attachments: [{ name: 'doc.pdf', content_type: 'application/pdf', data: tinyPdfBase64() }],
    });

    const token = firstToken(result);
    registerCleanup(token);
    expect(token).toBeTruthy();
  });
});
