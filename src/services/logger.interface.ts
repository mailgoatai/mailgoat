/**
 * Logger Interface
 * 
 * Simple logging interface for services.
 * Can be implemented by different logging backends.
 */

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log context data
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Logger Interface
 * 
 * Provides structured logging for services.
 * 
 * @public
 */
export interface ILogger {
  /**
   * Log a debug message
   * @param message - Log message
   * @param context - Optional context data
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log an info message
   * @param message - Log message
   * @param context - Optional context data
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log a warning message
   * @param message - Log message
   * @param context - Optional context data
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log an error message
   * @param message - Log message
   * @param error - Optional error object
   * @param context - Optional context data
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Log a message at specified level
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context data
   */
  log(level: LogLevel, message: string, context?: LogContext): void;
}

/**
 * Console Logger Implementation
 * Simple logger that outputs to console
 * 
 * @public
 */
export class ConsoleLogger implements ILogger {
  constructor(private prefix: string = 'MailGoat') {}

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const ctx = { ...context, error: error?.message, stack: error?.stack };
    this.log('error', message, ctx);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}]`;
    
    if (context && Object.keys(context).length > 0) {
      console.log(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

/**
 * Null Logger Implementation
 * Logger that does nothing (useful for testing)
 * 
 * @public
 */
export class NullLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  log(): void {}
}
