/**
 * Structured Logging with Winston
 *
 * Replaces console.log with structured, leveled logging.
 * Supports file rotation, environment-based configuration, and structured data.
 */

import winston from 'winston';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Log directory
 */
const LOG_DIR = path.join(os.homedir(), '.mailgoat', 'logs');

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
  }
}

// Create log directory
ensureLogDir();

/**
 * Custom format for console output (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const consoleJsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Custom format for file output (structured JSON)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || process.env.MAILGOAT_LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'mailgoat',
    version: process.env.npm_package_version || 'unknown',
  },
  transports: [
    // Error log - only errors
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    // Combined log - all levels
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

/**
 * Add console transport in development or when LOG_CONSOLE=true
 */
const isDevelopment = process.env.NODE_ENV !== 'production';
const forceConsole =
  process.env.LOG_CONSOLE === 'true' || process.env.MAILGOAT_LOG_CONSOLE === 'true';

if (isDevelopment || forceConsole) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

/**
 * Convenience methods for structured logging
 */

/**
 * Log an error with stack trace
 */
export function logError(
  message: string,
  error: Error | unknown,
  meta?: Record<string, any>
): void {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    });
  } else {
    logger.error(message, { error, ...meta });
  }
}

/**
 * Log operation start
 */
export function logOperationStart(operation: string, meta?: Record<string, any>): void {
  logger.info(`${operation}.start`, meta);
}

/**
 * Log operation success
 */
export function logOperationSuccess(
  operation: string,
  duration?: number,
  meta?: Record<string, any>
): void {
  logger.info(`${operation}.success`, {
    duration_ms: duration,
    ...meta,
  });
}

/**
 * Log operation failure
 */
export function logOperationFailure(
  operation: string,
  error: Error | unknown,
  duration?: number,
  meta?: Record<string, any>
): void {
  if (error instanceof Error) {
    logger.error(`${operation}.failure`, {
      duration_ms: duration,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    });
  } else {
    logger.error(`${operation}.failure`, {
      duration_ms: duration,
      error,
      ...meta,
    });
  }
}

/**
 * Log API request
 */
export function logApiRequest(method: string, url: string, meta?: Record<string, any>): void {
  logger.debug('api.request', {
    method,
    url,
    ...meta,
  });
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  url: string,
  status: number,
  duration: number,
  meta?: Record<string, any>
): void {
  const level = status >= 400 ? 'warn' : 'debug';
  logger.log(level, 'api.response', {
    method,
    url,
    status,
    duration_ms: duration,
    ...meta,
  });
}

/**
 * Log configuration change
 */
export function logConfigChange(operation: string, meta?: Record<string, any>): void {
  logger.info('config.change', {
    operation,
    ...meta,
  });
}

/**
 * Log email event
 */
export function logEmailEvent(
  event: 'send' | 'receive' | 'delete' | 'search',
  meta?: Record<string, any>
): void {
  logger.info(`email.${event}`, meta);
}

/**
 * Log validation error
 */
export function logValidationError(field: string, error: string, meta?: Record<string, any>): void {
  logger.warn('validation.error', {
    field,
    error,
    ...meta,
  });
}

/**
 * Log cache event
 */
export function logCacheEvent(
  event: 'hit' | 'miss' | 'set' | 'invalidate',
  key: string,
  meta?: Record<string, any>
): void {
  logger.debug(`cache.${event}`, {
    key,
    ...meta,
  });
}

/**
 * Create a timer for measuring operation duration
 */
export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

/**
 * Log directory path
 */
export function getLogDir(): string {
  return LOG_DIR;
}

/**
 * Log file paths
 */
export function getLogFiles(): { error: string; combined: string } {
  return {
    error: path.join(LOG_DIR, 'error.log'),
    combined: path.join(LOG_DIR, 'combined.log'),
  };
}

/**
 * Update active log level at runtime
 */
export function setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
  logger.level = level;
}

/**
 * Enable or disable all logger transports
 */
export function setLoggerSilent(silent: boolean): void {
  logger.transports.forEach((transport) => {
    transport.silent = silent;
  });
}

/**
 * Toggle JSON formatting for console transport
 */
export function setConsoleJson(enabled: boolean): void {
  logger.transports.forEach((transport) => {
    if (transport instanceof winston.transports.Console) {
      transport.format = enabled ? consoleJsonFormat : consoleFormat;
    }
  });
}

// Export logger as default
export default logger;
