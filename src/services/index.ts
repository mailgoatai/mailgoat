/**
 * Services Module
 *
 * Business logic layer for MailGoat.
 * Services encapsulate business operations and can be reused across different interfaces (CLI, API, etc.)
 *
 * @packageDocumentation
 */

// Logger
export { ILogger, LogLevel, LogContext, ConsoleLogger, NullLogger } from './logger.interface';

// Email Service
export {
  EmailService,
  SendEmailOptions,
  SendEmailResult,
  ReadEmailOptions,
  Email,
  EmailAttachment,
} from './email-service';
