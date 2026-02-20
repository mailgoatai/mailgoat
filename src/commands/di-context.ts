import { container, configureContainer, resetContainer } from '../container';
import { ConfigManager, MailGoatConfig } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { DependencyContainer } from 'tsyringe';

export interface CommandContext {
  config: MailGoatConfig;
  container: DependencyContainer;
}

/**
 * Load config and configure the DI container for a command invocation.
 */
export async function initializeCommandContext(): Promise<CommandContext> {
  const config = await new ConfigManager().load();
  resetContainer();
  configureContainer(config);
  return { config, container };
}

/**
 * Resolve a Postal client through the container.
 */
export function resolvePostalClient(
  c: DependencyContainer,
  options?: { enableRetry?: boolean }
): PostalClient {
  if (options?.enableRetry === false) {
    return c.resolve<PostalClient>('PostalClientRetryDisabled');
  }
  return c.resolve<PostalClient>('PostalClient');
}
