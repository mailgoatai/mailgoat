import { describeE2E } from './setup';
import { createE2EClient, firstToken, sendBasic, uniqueSubject } from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { cleanupMessages, registerCleanup } from './teardown';

describeE2E('E2E batch flows', () => {
  const env = getE2EEnv();
  const client = createE2EClient();

  afterAll(async () => {
    await cleanupMessages(client);
  });

  test('send batch of 10 emails in parallel', async () => {
    const sends = Array.from({ length: 10 }, (_, index) =>
      sendBasic(client, {
        to: [env.receiver],
        subject: uniqueSubject(`batch-${index}`),
        plain_body: `batch message ${index}`,
      })
    );

    const results = await Promise.all(sends);
    expect(results).toHaveLength(10);
    expect(
      results.every((result) => {
        const token = firstToken(result);
        registerCleanup(token);
        return Boolean(token);
      })
    ).toBe(true);
  });

  test('send one email to multiple recipients in single operation', async () => {
    const recipients = [env.receiver, env.sender];
    const result = await sendBasic(client, {
      to: recipients,
      subject: uniqueSubject('multi-recipient'),
      plain_body: 'single send, multiple recipients',
    });

    const token = firstToken(result);
    registerCleanup(token);
    expect(Object.keys(result.messages).length).toBeGreaterThanOrEqual(1);
  });
});
