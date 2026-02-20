/**
 * Validation Service
 *
 * Centralized validation logic for MailGoat CLI.
 * Provides consistent validation with helpful error messages.
 */

import { debugLogger } from './debug';

/**
 * Validation result with success status and optional error
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

/**
 * Send command options for validation
 */
export interface SendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  tag?: string;
  attachments?: string[];
}

/**
 * Configuration object for validation
 */
export interface Config {
  provider?: 'postal' | 'sendgrid' | 'mailgun' | 'smtp' | 'ses';
  server: string;
  fromAddress?: string;
  fromName?: string;
  email?: string;
  api_key: string;
  mailgun?: {
    apiKey?: string;
    domain?: string;
    region?: 'us' | 'eu';
  };
  relay?: {
    provider: 'sendgrid' | 'mailgun' | 'ses' | 'mailjet';
    credentials: {
      apiKey?: string;
      apiSecret?: string;
      domain?: string;
      accessKey?: string;
      secret?: string;
      region?: string;
    };
  };
  webhook?: {
    url?: string;
    secret?: string;
  };
  metrics?: {
    pushgateway?: string;
  };
}

/**
 * ValidationService class
 *
 * Centralizes all validation logic with consistent error handling.
 * Designed for dependency injection and easy testing.
 */
export class ValidationService {
  /**
   * Validate email address format
   * @param email Email address to validate
   * @returns Validation result
   */
  validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return {
        valid: false,
        error: 'Email is required',
        field: 'email',
      };
    }

    // RFC 5322 compliant regex (simplified)
    const regex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    const valid = regex.test(email.trim());

    if (!valid) {
      return {
        valid: false,
        error: `Invalid email format: "${email}". Must be in format: user@example.com`,
        field: 'email',
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple email addresses
   * @param emails Array of email addresses
   * @param fieldName Name of the field (for error messages)
   * @returns Validation result
   */
  validateEmails(emails: string[], fieldName: string = 'email'): ValidationResult {
    if (!Array.isArray(emails) || emails.length === 0) {
      return {
        valid: false,
        error: `${fieldName} addresses are required`,
        field: fieldName,
      };
    }

    for (const email of emails) {
      const result = this.validateEmail(email);
      if (!result.valid) {
        return {
          valid: false,
          error: `Invalid ${fieldName} address: ${result.error}`,
          field: fieldName,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate URL format
   * @param url URL to validate
   * @returns Validation result
   */
  validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        error: 'URL is required',
        field: 'url',
      };
    }

    const trimmed = url.trim();

    try {
      // Add https:// if no protocol specified
      const urlToTest =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`;

      new URL(urlToTest);
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: `Invalid URL format: "${url}". Must be a valid URL`,
        field: 'url',
      };
    }
  }

  /**
   * Validate API key format
   * @param key API key to validate
   * @returns Validation result
   */
  validateApiKey(key: string): ValidationResult {
    if (!key || typeof key !== 'string') {
      return {
        valid: false,
        error: 'API key is required',
        field: 'api_key',
      };
    }

    const trimmed = key.trim();

    // Must be at least 10 characters
    if (trimmed.length < 10) {
      return {
        valid: false,
        error: 'API key must be at least 10 characters',
        field: 'api_key',
      };
    }

    // Should contain only alphanumeric, dash, underscore
    // (Postal keys can have various formats)
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(trimmed)) {
      return {
        valid: false,
        error:
          'API key contains invalid characters. Use only letters, numbers, dashes, and underscores',
        field: 'api_key',
      };
    }

    return { valid: true };
  }

  /**
   * Validate subject line
   * @param subject Subject to validate
   * @returns Validation result
   */
  validateSubject(subject: string): ValidationResult {
    if (!subject || typeof subject !== 'string') {
      return {
        valid: false,
        error: 'Subject is required',
        field: 'subject',
      };
    }

    const trimmed = subject.trim();

    if (trimmed.length === 0) {
      return {
        valid: false,
        error: 'Subject cannot be empty',
        field: 'subject',
      };
    }

    if (trimmed.length > 998) {
      return {
        valid: false,
        error: 'Subject is too long (maximum 998 characters)',
        field: 'subject',
      };
    }

    return { valid: true };
  }

  /**
   * Validate email body
   * @param body Plain text body
   * @param html HTML body
   * @returns Validation result
   */
  validateBody(body?: string, html?: string): ValidationResult {
    // At least one body type must be provided
    const hasPlainBody = body && typeof body === 'string' && body.trim().length > 0;
    const hasHtmlBody = html && typeof html === 'string' && html.trim().length > 0;

    if (!hasPlainBody && !hasHtmlBody) {
      return {
        valid: false,
        error: 'Email body is required (use --body or --html)',
        field: 'body',
      };
    }

    return { valid: true };
  }

  /**
   * Validate tag format
   * @param tag Tag to validate
   * @returns Validation result
   */
  validateTag(tag: string): ValidationResult {
    if (!tag || typeof tag !== 'string') {
      return {
        valid: false,
        error: 'Tag is required',
        field: 'tag',
      };
    }

    const trimmed = tag.trim();

    // Tags should be reasonable length
    if (trimmed.length === 0 || trimmed.length > 100) {
      return {
        valid: false,
        error: 'Tag must be between 1 and 100 characters',
        field: 'tag',
      };
    }

    // Allow alphanumeric, dash, underscore
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(trimmed)) {
      return {
        valid: false,
        error: 'Tag must contain only letters, numbers, dashes, and underscores',
        field: 'tag',
      };
    }

    return { valid: true };
  }

  /**
   * Validate file path
   * @param path File path to validate
   * @returns Validation result
   */
  validateFilePath(path: string): ValidationResult {
    if (!path || typeof path !== 'string') {
      return {
        valid: false,
        error: 'File path is required',
        field: 'path',
      };
    }

    const trimmed = path.trim();

    if (trimmed.length === 0) {
      return {
        valid: false,
        error: 'File path cannot be empty',
        field: 'path',
      };
    }

    // Check for obviously invalid paths
    if (trimmed.includes('\0')) {
      return {
        valid: false,
        error: 'File path contains invalid characters',
        field: 'path',
      };
    }

    return { valid: true };
  }

  /**
   * Validate recipient count
   * @param count Number of recipients
   * @param type Type of recipients (to, cc, bcc)
   * @returns Validation result
   */
  validateRecipientCount(count: number, type: 'to' | 'cc' | 'bcc'): ValidationResult {
    const maxRecipients = 50; // Postal limit

    if (count > maxRecipients) {
      return {
        valid: false,
        error: `Too many ${type.toUpperCase()} recipients (maximum ${maxRecipients})`,
        field: type,
      };
    }

    return { valid: true };
  }

  /**
   * Validate send command options
   * @param options Send command options
   * @returns Validation result
   */
  validateSendOptions(options: SendOptions): ValidationResult {
    debugLogger.log('validation', 'Validating send options');
    debugLogger.logObject('validation', 'Options', {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      bodyLength: options.body?.length,
      htmlLength: options.html?.length,
      from: options.from,
      tag: options.tag,
    });

    // Validate TO recipients
    const toResult = this.validateEmails(options.to, 'to');
    if (!toResult.valid) {
      debugLogger.log('validation', `Invalid To email: ${toResult.error}`);
      return toResult;
    }

    // Validate CC if provided
    if (options.cc && options.cc.length > 0) {
      const ccResult = this.validateEmails(options.cc, 'cc');
      if (!ccResult.valid) {
        debugLogger.log('validation', `Invalid CC email: ${ccResult.error}`);
        return ccResult;
      }
    }

    // Validate BCC if provided
    if (options.bcc && options.bcc.length > 0) {
      const bccResult = this.validateEmails(options.bcc, 'bcc');
      if (!bccResult.valid) {
        debugLogger.log('validation', `Invalid BCC email: ${bccResult.error}`);
        return bccResult;
      }
    }

    // Validate FROM if provided
    if (options.from) {
      const fromResult = this.validateEmail(options.from);
      if (!fromResult.valid) {
        debugLogger.log('validation', `Invalid From email: ${fromResult.error}`);
        return {
          valid: false,
          error: `Invalid From address: ${fromResult.error}`,
          field: 'from',
        };
      }
    }

    // Validate recipient counts
    const toCountResult = this.validateRecipientCount(options.to.length, 'to');
    if (!toCountResult.valid) {
      debugLogger.log('validation', `Too many To recipients: ${options.to.length}`);
      return toCountResult;
    }

    if (options.cc) {
      const ccCountResult = this.validateRecipientCount(options.cc.length, 'cc');
      if (!ccCountResult.valid) {
        debugLogger.log('validation', `Too many CC recipients: ${options.cc.length}`);
        return ccCountResult;
      }
    }

    if (options.bcc) {
      const bccCountResult = this.validateRecipientCount(options.bcc.length, 'bcc');
      if (!bccCountResult.valid) {
        debugLogger.log('validation', `Too many BCC recipients: ${options.bcc.length}`);
        return bccCountResult;
      }
    }

    // Validate subject
    const subjectResult = this.validateSubject(options.subject);
    if (!subjectResult.valid) {
      debugLogger.log('validation', `Invalid subject: ${subjectResult.error}`);
      return subjectResult;
    }

    // Validate body
    const bodyResult = this.validateBody(options.body, options.html);
    if (!bodyResult.valid) {
      debugLogger.log('validation', `Invalid body: ${bodyResult.error}`);
      return bodyResult;
    }

    // Validate tag if provided
    if (options.tag) {
      const tagResult = this.validateTag(options.tag);
      if (!tagResult.valid) {
        debugLogger.log('validation', `Invalid tag: ${tagResult.error}`);
        return tagResult;
      }
    }

    // Validate attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      for (const attachment of options.attachments) {
        const pathResult = this.validateFilePath(attachment);
        if (!pathResult.valid) {
          debugLogger.log('validation', `Invalid attachment: ${pathResult.error}`);
          return {
            valid: false,
            error: `Invalid attachment: ${pathResult.error}`,
            field: 'attachments',
          };
        }
      }
    }

    debugLogger.log('validation', 'All validations passed ✓');
    return { valid: true };
  }

  /**
   * Validate configuration object
   * @param config Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: Config): ValidationResult {
    debugLogger.log('validation', 'Validating configuration');

    const hasMailgunProvider = config.provider === 'mailgun';
    const hasRelay = Boolean(config.relay?.provider);
    const hasPostal = !hasMailgunProvider && Boolean(config.server && config.api_key);

    if (!hasRelay && !hasPostal && !hasMailgunProvider) {
      return {
        valid: false,
        error:
          'Either Postal config (server + api_key), relay config, or provider=mailgun config is required',
        field: 'server',
      };
    }

    // Validate server URL when Postal mode is used.
    if (hasPostal) {
      const serverResult = this.validateUrl(config.server);
      if (!serverResult.valid) {
        return {
          valid: false,
          error: `Invalid server: ${serverResult.error}`,
          field: 'server',
        };
      }
    }

    // Validate from address (fallback to legacy email key)
    const fromAddress = config.fromAddress || config.email;
    const emailResult = this.validateEmail(fromAddress || '');
    if (!fromAddress || !emailResult.valid) {
      return {
        valid: false,
        error: `Invalid from address: ${emailResult.error}`,
        field: 'fromAddress',
      };
    }

    // Validate API key in Postal mode
    if (hasPostal) {
      const apiKeyResult = this.validateApiKey(config.api_key);
      if (!apiKeyResult.valid) {
        return {
          valid: false,
          error: `Invalid API key: ${apiKeyResult.error}`,
          field: 'api_key',
        };
      }
    }

    // Validate relay credentials
    if (hasRelay) {
      const relay = config.relay!;
      const creds = relay.credentials || {};
      if (relay.provider === 'sendgrid') {
        if (!creds.apiKey || creds.apiKey.trim().length < 10) {
          return {
            valid: false,
            error: 'Relay sendgrid requires credentials.apiKey',
            field: 'relay.credentials.apiKey',
          };
        }
      } else if (relay.provider === 'mailgun') {
        if (!creds.apiKey || creds.apiKey.trim().length < 10) {
          return {
            valid: false,
            error: 'Relay mailgun requires credentials.apiKey',
            field: 'relay.credentials.apiKey',
          };
        }
        if (!creds.domain) {
          return {
            valid: false,
            error: 'Relay mailgun requires credentials.domain',
            field: 'relay.credentials.domain',
          };
        }
      } else if (relay.provider === 'ses') {
        if (!creds.accessKey || !creds.secret || !creds.region) {
          return {
            valid: false,
            error:
              'Relay ses requires credentials.accessKey, credentials.secret, and credentials.region',
            field: 'relay.credentials',
          };
        }
      } else if (relay.provider === 'mailjet') {
        if (!creds.apiKey || !creds.apiSecret) {
          return {
            valid: false,
            error: 'Relay mailjet requires credentials.apiKey and credentials.apiSecret',
            field: 'relay.credentials',
          };
        }
      }
    }

    if (hasMailgunProvider) {
      const mailgun = config.mailgun || {};
      if (!mailgun.apiKey || mailgun.apiKey.trim().length < 10) {
        return {
          valid: false,
          error: 'Provider mailgun requires mailgun.apiKey',
          field: 'mailgun.apiKey',
        };
      }
      if (!mailgun.domain || !mailgun.domain.trim()) {
        return {
          valid: false,
          error: 'Provider mailgun requires mailgun.domain',
          field: 'mailgun.domain',
        };
      }
      if (mailgun.region && !['us', 'eu'].includes(mailgun.region)) {
        return {
          valid: false,
          error: 'Provider mailgun region must be us or eu',
          field: 'mailgun.region',
        };
      }
    }

    // Validate webhook URL if provided
    if (config.webhook?.url) {
      const webhookUrlResult = this.validateUrl(config.webhook.url);
      if (!webhookUrlResult.valid) {
        return {
          valid: false,
          error: `Invalid webhook URL: ${webhookUrlResult.error}`,
          field: 'webhook.url',
        };
      }
    }

    // Validate metrics pushgateway URL if provided
    if (config.metrics?.pushgateway) {
      const pushgatewayResult = this.validateUrl(config.metrics.pushgateway);
      if (!pushgatewayResult.valid) {
        return {
          valid: false,
          error: `Invalid metrics pushgateway URL: ${pushgatewayResult.error}`,
          field: 'metrics.pushgateway',
        };
      }
    }

    debugLogger.log('validation', 'Configuration validation passed ✓');
    return { valid: true };
  }
}

// Export singleton instance for convenience
export const validationService = new ValidationService();
