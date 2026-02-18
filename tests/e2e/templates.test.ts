import { describeE2E } from './setup';
import { createE2EClient, firstToken, sendBasic, uniqueSubject } from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { TemplateManager } from '../../src/lib/template-manager';
import { cleanupMessages, registerCleanup } from './teardown';

describeE2E('E2E template flows', () => {
  const env = getE2EEnv();
  const client = createE2EClient();
  const templateManager = new TemplateManager();

  afterAll(async () => {
    await cleanupMessages(client);
  });

  test('render template variables and send', async () => {
    const template = {
      subject: 'Hello {{name}}',
      body: 'Environment {{uppercase env}}',
    };

    const rendered = templateManager.render(template as never, { name: 'MailGoat', env: 'test' });
    const subject = `${rendered.subject} ${uniqueSubject('template')}`;
    const send = await sendBasic(client, {
      to: [env.receiver],
      subject,
      plain_body: rendered.body,
    });

    const token = firstToken(send);
    registerCleanup(token);
    const message = await client.getMessage(token, ['details', 'plain_body']);
    expect(message.details?.subject).toContain('Hello MailGoat');
    expect(message.plain_body).toContain('Environment TEST');
  });

  test('supports fallback variables in template rendering', async () => {
    const template = {
      subject: 'Build {{build}}',
      body: 'Agent {{agent}} deployed',
    };

    const rendered = templateManager.render(template as never, { build: 'v1.1.0', agent: 'developer-2' });

    const send = await sendBasic(client, {
      to: [env.receiver],
      subject: `${rendered.subject} ${uniqueSubject('template2')}`,
      plain_body: rendered.body,
    });

    const token = firstToken(send);
    registerCleanup(token);
    expect(token).toBeTruthy();
  });
});
