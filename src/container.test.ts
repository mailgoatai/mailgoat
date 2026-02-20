import { container, configureContainer, resetContainer } from './container';
import { MailGoatConfig } from './lib/config';

/**
 * Configure a DI container for tests with deterministic defaults.
 */
export function configureTestContainer(overrides: Partial<MailGoatConfig> = {}): void {
  resetContainer();

  const baseConfig: MailGoatConfig = {
    provider: 'postal',
    server: 'https://postal.test.local',
    fromAddress: 'test@example.com',
    api_key: 'test-api-key',
    ...overrides,
  };

  configureContainer(baseConfig);
}

export { container };

describe('test container bootstrap', () => {
  afterEach(() => {
    resetContainer();
  });

  it('registers test config and resolves it', () => {
    configureTestContainer({ fromAddress: 'di-test@example.com' });
    const resolved = container.resolve<MailGoatConfig>('Config');
    expect(resolved.fromAddress).toBe('di-test@example.com');
  });
});
