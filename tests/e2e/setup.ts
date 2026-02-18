import { getE2EEnv, hasRequiredE2EEnv } from './helpers/env';

const env = getE2EEnv();

if (!hasRequiredE2EEnv(env)) {
  // eslint-disable-next-line no-console
  console.warn(
    '[E2E] MAILGOAT_E2E_* variables are not fully set. E2E tests will be skipped unless MAILGOAT_E2E_ENABLED=true with all required fields.'
  );
}

jest.setTimeout(60_000);

export const describeE2E = hasRequiredE2EEnv(env) ? describe : describe.skip;
