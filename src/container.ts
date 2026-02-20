/**
 * Dependency Injection Container
 *
 * Central configuration for dependency injection using TSyringe.
 * Registers all services, providers, and their dependencies.
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { IMailProvider, ProviderFactory } from './providers';
import { EmailService } from './services/email-service';
import { ILogger, ConsoleLogger } from './services/logger.interface';
import { ValidationService, validationService } from './lib/validation-service';
import { MailGoatConfig } from './lib/config';
import { ConfigManager } from './lib/config';
import { PostalClient, PostalClientOptions } from './lib/postal-client';
import { TemplateManager } from './lib/template-manager';
import { SchedulerStore } from './lib/scheduler';
import { InboxStore } from './lib/inbox-store';
import { ReadMessageUseCase } from './application/use-cases/read-message.use-case';
import { SendBatchUseCase } from './application/use-cases/send-batch.use-case';

/**
 * Configure the DI container with all application dependencies
 *
 * @param config - MailGoat configuration
 */
export function configureContainer(config: MailGoatConfig): void {
  // Register configuration
  container.register<MailGoatConfig>('Config', {
    useValue: config,
  });
  container.register<ConfigManager>('ConfigManager', {
    useFactory: () => new ConfigManager(),
  });

  // Register logger
  container.register<ILogger>('ILogger', {
    useClass: ConsoleLogger,
  });

  // Register validation service
  container.register<ValidationService>('ValidationService', {
    useValue: validationService,
  });
  container.register<TemplateManager>('TemplateManager', {
    useFactory: () => new TemplateManager(),
  });
  container.register<SchedulerStore>('SchedulerStore', {
    useFactory: () => new SchedulerStore(),
  });
  container.register<InboxStore>('InboxStore', {
    useFactory: () => new InboxStore(),
  });
  container.register<PostalClient>('PostalClient', {
    useFactory: (c) => new PostalClient(c.resolve<MailGoatConfig>('Config')),
  });
  container.register<PostalClient>('PostalClientRetryDisabled', {
    useFactory: (c) =>
      new PostalClient(c.resolve<MailGoatConfig>('Config'), {
        enableRetry: false,
      } as PostalClientOptions),
  });
  container.register<ReadMessageUseCase>(ReadMessageUseCase, {
    useClass: ReadMessageUseCase,
  });
  container.register<SendBatchUseCase>(SendBatchUseCase, {
    useClass: SendBatchUseCase,
  });

  // Register mail provider
  container.register<IMailProvider>('IMailProvider', {
    useFactory: (c) => {
      const cfg = c.resolve<MailGoatConfig>('Config');
      return ProviderFactory.createFromConfig(cfg);
    },
  });

  // Register email service
  container.register<EmailService>('EmailService', {
    useFactory: (c) => {
      const provider = c.resolve<IMailProvider>('IMailProvider');
      const logger = c.resolve<ILogger>('ILogger');
      const validator = c.resolve<ValidationService>('ValidationService');
      return new EmailService(provider, logger, validator);
    },
  });
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer(): void {
  container.reset();
}

/**
 * Get the configured DI container
 */
export { container };
