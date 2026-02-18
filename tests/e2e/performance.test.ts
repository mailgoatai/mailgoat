import { describeE2E } from './setup';
import { createE2EClient, firstToken, sendBasic, uniqueSubject } from './helpers/client';
import { getE2EEnv } from './helpers/env';
import { cleanupMessages, registerCleanup } from './teardown';

describeE2E('E2E performance baseline', () => {
  const env = getE2EEnv();
  const client = createE2EClient();

  afterAll(async () => {
    await cleanupMessages(client);
  });

  test('send 100 emails in parallel (optional heavy test)', async () => {
    if (process.env.MAILGOAT_E2E_PERF !== 'true') {
      return;
    }

    const start = Date.now();
    const sends = Array.from({ length: 100 }, (_, index) =>
      sendBasic(client, {
        to: [env.receiver],
        subject: uniqueSubject(`perf-${index}`),
        plain_body: `performance message ${index}`,
      })
    );

    const settled = await Promise.allSettled(sends);
    const success = settled.filter((row) => row.status === 'fulfilled');
    const failure = settled.length - success.length;

    const durationMs = Date.now() - start;
    const throughput = Number(((success.length / durationMs) * 1000).toFixed(2));

    // eslint-disable-next-line no-console
    console.log(
      `[E2E PERF] sent=${success.length} failed=${failure} durationMs=${durationMs} throughputPerSec=${throughput}`
    );

    expect(success.length).toBeGreaterThanOrEqual(95);
    expect(success.every((row) => row.status === 'fulfilled')).toBe(true);
    for (const row of success) {
      if (row.status === 'fulfilled') {
        registerCleanup(firstToken(row.value));
      }
    }
  });
});
