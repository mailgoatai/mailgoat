/**
 * Mail Providers Module
 *
 * Abstraction layer for email service providers.
 * Allows switching between different providers without changing application code.
 *
 * @packageDocumentation
 */

// Core interfaces
export {
  IMailProvider,
  SendMessageParams,
  SendMessageResponse,
  MessageDetails,
  ListMessagesOptions,
  Message,
  ProviderConfig,
  ProviderOptions,
} from './mail-provider.interface';

// Provider implementations
export { PostalProvider, PostalProviderConfig, PostalProviderOptions } from './postal';
export { SESProvider, SESProviderConfig } from './ses';
export { MailgunProvider, MailgunProviderConfig } from './mailgun';
export { SMTPProvider, SMTPProviderConfig } from './smtp';

// Factory
export { ProviderFactory, ProviderType } from './provider-factory';
