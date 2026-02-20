/**
 * Debug logging utility for MailGoat CLI
 *
 * Supports both --debug flag and DEBUG environment variable
 * Usage:
 *   DEBUG=mailgoat:* mailgoat send ...
 *   DEBUG=mailgoat:api mailgoat send ...
 *   mailgoat send --debug ...
 */

import chalk from 'chalk';

export type DebugNamespace =
  | 'api'
  | 'config'
  | 'validation'
  | 'main'
  | 'timing'
  | 'cache'
  | 'queue-worker'
  | '*';

interface TimingData {
  start: number;
  label: string;
}

class DebugLogger {
  private enabled = false;
  private enabledNamespaces = new Set<string>();
  private timings = new Map<string, TimingData>();

  constructor() {
    this.parseDebugEnv();
  }

  /**
   * Parse DEBUG environment variable
   * Examples:
   *   DEBUG=mailgoat:*
   *   DEBUG=mailgoat:api,mailgoat:config
   *   DEBUG=*
   */
  private parseDebugEnv(): void {
    const debugEnv = process.env.DEBUG;
    if (!debugEnv) return;

    const patterns = debugEnv.split(',').map((p) => p.trim());

    for (const pattern of patterns) {
      if (pattern === '*' || pattern === 'mailgoat:*') {
        this.enabled = true;
        this.enabledNamespaces.add('*');
      } else if (pattern.startsWith('mailgoat:')) {
        this.enabled = true;
        const namespace = pattern.replace('mailgoat:', '');
        this.enabledNamespaces.add(namespace);
      }
    }
  }

  /**
   * Enable debug mode globally
   */
  enable(): void {
    this.enabled = true;
    if (this.enabledNamespaces.size === 0) {
      this.enabledNamespaces.add('*');
    }
  }

  /**
   * Check if debugging is enabled for a namespace
   */
  isEnabled(namespace: DebugNamespace = '*'): boolean {
    if (!this.enabled) return false;
    if (this.enabledNamespaces.has('*')) return true;
    return this.enabledNamespaces.has(namespace);
  }

  /**
   * Log a debug message with namespace
   */
  log(namespace: DebugNamespace, message: string, ...args: any[]): void {
    if (!this.isEnabled(namespace)) return;

    const timestamp = new Date().toISOString();
    const prefix = chalk.gray(`[${timestamp}]`) + chalk.cyan(` [mailgoat:${namespace}]`);

    console.error(prefix, message, ...args);
  }

  /**
   * Log an object (pretty-printed JSON)
   */
  logObject(namespace: DebugNamespace, label: string, obj: any): void {
    if (!this.isEnabled(namespace)) return;

    const timestamp = new Date().toISOString();
    const prefix = chalk.gray(`[${timestamp}]`) + chalk.cyan(` [mailgoat:${namespace}]`);

    console.error(prefix, chalk.bold(label + ':'));
    console.error(chalk.gray(JSON.stringify(obj, null, 2)));
  }

  /**
   * Start timing an operation
   */
  timeStart(id: string, label: string): void {
    if (!this.isEnabled('timing')) return;

    this.timings.set(id, {
      start: Date.now(),
      label,
    });

    this.log('timing', chalk.yellow(`⏱️  Started: ${label}`));
  }

  /**
   * End timing an operation and log duration
   */
  timeEnd(id: string): void {
    if (!this.isEnabled('timing')) return;

    const timing = this.timings.get(id);
    if (!timing) return;

    const duration = Date.now() - timing.start;
    const formatted = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;

    this.log('timing', chalk.green(`✓ Completed: ${timing.label} (${formatted})`));
    this.timings.delete(id);
  }

  /**
   * Log HTTP request details
   */
  logRequest(method: string, url: string, headers?: Record<string, any>, body?: any): void {
    if (!this.isEnabled('api')) return;

    this.log('api', chalk.bold(`→ ${method.toUpperCase()} ${url}`));

    if (headers) {
      const sanitized = this.sanitizeHeaders(headers);
      this.logObject('api', '  Headers', sanitized);
    }

    if (body) {
      const sanitized = this.sanitizeBody(body);
      this.logObject('api', '  Body', sanitized);
    }
  }

  /**
   * Log HTTP response details
   */
  logResponse(status: number, statusText: string, body?: any, duration?: number): void {
    if (!this.isEnabled('api')) return;

    const statusColor = status >= 200 && status < 300 ? chalk.green : chalk.red;
    let message = statusColor(`← ${status} ${statusText}`);

    if (duration !== undefined) {
      const formatted = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
      message += chalk.gray(` (${formatted})`);
    }

    this.log('api', message);

    if (body) {
      this.logObject('api', '  Response', body);
    }
  }

  /**
   * Log an error with stack trace
   */
  logError(namespace: DebugNamespace, error: any): void {
    if (!this.isEnabled(namespace)) return;

    const timestamp = new Date().toISOString();
    const prefix = chalk.gray(`[${timestamp}]`) + chalk.cyan(` [mailgoat:${namespace}]`);

    console.error(prefix, chalk.red('✗ Error:'), error.message);

    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }

    if (error.response?.data) {
      this.logObject(namespace, '  Error Details', error.response.data);
    }
  }

  /**
   * Sanitize headers to hide sensitive data
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };

    const sensitiveKeys = ['x-server-api-key', 'authorization', 'cookie', 'api-key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        const value = sanitized[key];
        if (typeof value === 'string') {
          // Show first 4 and last 4 characters
          sanitized[key] =
            value.length > 12
              ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
              : '***';
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body to hide sensitive data
   */
  private sanitizeBody(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized = Array.isArray(body) ? [...body] : { ...body };

    // Sanitize common sensitive fields
    const sensitiveFields = ['password', 'token', 'api_key', 'secret'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      }
    }

    return sanitized;
  }
}

// Singleton instance
const debugLogger = new DebugLogger();

export { debugLogger };
