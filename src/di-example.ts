/**
 * Dependency Injection Usage Example
 *
 * This file demonstrates how to use the DI container in commands and other code.
 */

import { container, configureContainer } from './container';
import { EmailService } from './services/email-service';
import { IMailProvider } from './providers';
import { ConfigManager } from './lib/config';

/**
 * Example: Using DI in a command
 */
export async function exampleCommandUsage() {
  // 1. Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.load();

  // 2. Configure DI container
  configureContainer(config);

  // 3. Resolve EmailService (all dependencies injected automatically)
  const emailService = container.resolve(EmailService);

  // 4. Use the service
  const result = await emailService.sendEmail({
    to: ['user@example.com'],
    subject: 'Test Email',
    body: 'This email was sent using dependency injection!',
  });

  console.log(`Email sent: ${result.messageId}`);
}

/**
 * Example: Resolving specific services
 */
export function exampleSpecificResolution() {
  // Resolve mail provider directly
  const mailProvider = container.resolve<IMailProvider>('IMailProvider');

  // Resolve email service directly
  const emailService = container.resolve<EmailService>('EmailService');

  return { mailProvider, emailService };
}

/**
 * Example: Manual service creation (without DI)
 * This is still supported for backwards compatibility
 */
export async function exampleManualCreation() {
  const configManager = new ConfigManager();
  const config = await configManager.load();

  // Old way (still works)
  const { ProviderFactory } = require('./providers');
  const provider = ProviderFactory.createFromConfig(config);
  const emailService = new EmailService(provider);

  return emailService;
}

/**
 * Example: Testing with DI
 */
export function exampleTestingSetup() {
  const { resetContainer } = require('./container');
  const { NullLogger } = require('./services/logger.interface');

  // Reset container for clean test state
  resetContainer();

  // Register test doubles
  container.register('ILogger', {
    useClass: NullLogger, // Silent logger for tests
  });

  // Mock provider for testing
  class MockMailProvider implements IMailProvider {
    async sendMessage() {
      return { message_id: 'mock-id-123' };
    }
    async getMessage() {
      return { id: 1, token: 'mock' } as any;
    }
  }

  container.register<IMailProvider>('IMailProvider', {
    useClass: MockMailProvider,
  });

  // Now resolve services - they'll use mocks
  const emailService = container.resolve(EmailService);
  return emailService;
}

// Note: These are examples only and should not be imported directly.
// Use the patterns shown here in your actual commands and tests.
