import { describeE2E } from './setup';
import { createE2EClient, sendBasic, uniqueSubject } from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { validationService } from '../../src/lib/validation-service';
import { PostalClient } from '../../src/lib/postal-client';

describeE2E('E2E error flows', () => {
  const env = getE2EEnv();
  const client = createE2EClient();

  test('invalid recipient is rejected by validation layer', () => {
    const result = validationService.validateSendOptions({
      to: ['not-an-email'],
      subject: 'bad recipient',
      body: 'x',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid to address');
  });

  test('authentication failure returns clear API error', async () => {
    const badClient = new PostalClient({
      server: env.server,
      api_key: 'invalid_key_for_e2e',
      fromAddress: env.sender,
    });

    await expect(
      sendBasic(badClient, {
        to: [env.receiver],
        subject: uniqueSubject('auth-fail'),
        plain_body: 'should fail',
      })
    ).rejects.toThrow();
  });

  test('retry logic triggers on unreachable server and fails gracefully', async () => {
    const flakyClient = new PostalClient(
      {
        server: 'http://127.0.0.1:1',
        api_key: env.apiKey,
        fromAddress: env.sender,
      },
      { enableRetry: true, maxRetries: 2, baseDelay: 50 }
    );

    await expect(
      sendBasic(flakyClient, {
        to: [env.receiver],
        subject: uniqueSubject('retry-fail'),
        plain_body: 'retry test',
      })
    ).rejects.toThrow();
  });
});
