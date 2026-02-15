/**
 * Input validation utilities for MailGoat CLI
 *
 * Validates user inputs before making API calls to prevent errors
 * and provide helpful feedback.
 */

/**
 * Validate email address format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant regex (simplified)
  const regex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return regex.test(email.trim());
}

/**
 * Validate multiple email addresses
 * @param emails Array of email addresses
 * @returns Object with valid status and first invalid email if any
 */
export function validateEmails(emails: string[]): { valid: boolean; invalidEmail?: string } {
  if (!Array.isArray(emails) || emails.length === 0) {
    return { valid: false, invalidEmail: undefined };
  }

  for (const email of emails) {
    if (!validateEmail(email)) {
      return { valid: false, invalidEmail: email };
    }
  }

  return { valid: true };
}

/**
 * Validate URL format
 * @param url URL to validate (with or without protocol)
 * @returns true if valid, false otherwise
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();

  try {
    // Add https:// if no protocol specified
    const urlToTest =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key format
 * @param key API key to validate
 * @returns true if valid, false otherwise
 */
export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const trimmed = key.trim();

  // Must be at least 10 characters
  if (trimmed.length < 10) {
    return false;
  }

  // Should contain only alphanumeric, dash, underscore
  // (Postal keys can have various formats)
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(trimmed);
}

/**
 * Validate subject line
 * @param subject Subject to validate
 * @returns Object with valid status and error message if invalid
 */
export function validateSubject(subject: string): { valid: boolean; error?: string } {
  if (!subject || typeof subject !== 'string') {
    return { valid: false, error: 'Subject is required' };
  }

  const trimmed = subject.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Subject cannot be empty' };
  }

  if (trimmed.length > 998) {
    return { valid: false, error: 'Subject is too long (maximum 998 characters)' };
  }

  return { valid: true };
}

/**
 * Validate email body
 * @param body Body text to validate
 * @param html HTML body (optional)
 * @returns Object with valid status and error message if invalid
 */
export function validateBody(body?: string, html?: string): { valid: boolean; error?: string } {
  // At least one body type must be provided
  const hasPlainBody = body && typeof body === 'string' && body.trim().length > 0;
  const hasHtmlBody = html && typeof html === 'string' && html.trim().length > 0;

  if (!hasPlainBody && !hasHtmlBody) {
    return { valid: false, error: 'Email body is required (use --body or --html)' };
  }

  return { valid: true };
}

/**
 * Validate tag format
 * @param tag Tag to validate
 * @returns true if valid, false otherwise
 */
export function validateTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') {
    return false;
  }

  const trimmed = tag.trim();

  // Tags should be reasonable length
  if (trimmed.length === 0 || trimmed.length > 100) {
    return false;
  }

  // Allow alphanumeric, dash, underscore
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(trimmed);
}

/**
 * Validate file path
 * @param path File path to validate
 * @returns Object with valid status and error message if invalid
 */
export function validateFilePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'File path is required' };
  }

  const trimmed = path.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'File path cannot be empty' };
  }

  // Check for obviously invalid paths
  if (trimmed.includes('\0')) {
    return { valid: false, error: 'File path contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate recipient count
 * @param count Number of recipients
 * @param type Type of recipients (to, cc, bcc)
 * @returns Object with valid status and error message if invalid
 */
export function validateRecipientCount(
  count: number,
  type: 'to' | 'cc' | 'bcc'
): { valid: boolean; error?: string } {
  const maxRecipients = 50; // Postal limit

  if (count > maxRecipients) {
    return {
      valid: false,
      error: `Too many ${type.toUpperCase()} recipients (maximum ${maxRecipients})`,
    };
  }

  return { valid: true };
}

/**
 * Create a validation error message
 * @param field Field name
 * @param value Invalid value
 * @param reason Reason why it's invalid
 * @param suggestion Optional suggestion for fix
 * @returns Formatted error message
 */
export function createValidationError(
  field: string,
  value: string,
  reason: string,
  suggestion?: string
): string {
  let message = `Invalid ${field}: "${value}"\n${reason}`;

  if (suggestion) {
    message += `\n${suggestion}`;
  }

  return message;
}

/**
 * Validate all send command inputs
 * @param params Send command parameters
 * @returns Object with valid status and error message if invalid
 */
export function validateSendInputs(params: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  tag?: string;
}): { valid: boolean; error?: string } {
  // Validate recipient emails
  const toValidation = validateEmails(params.to);
  if (!toValidation.valid) {
    return {
      valid: false,
      error: createValidationError(
        'email address',
        toValidation.invalidEmail || '',
        'Must be in format: user@example.com'
      ),
    };
  }

  // Validate CC if provided
  if (params.cc && params.cc.length > 0) {
    const ccValidation = validateEmails(params.cc);
    if (!ccValidation.valid) {
      return {
        valid: false,
        error: createValidationError(
          'CC email address',
          ccValidation.invalidEmail || '',
          'Must be in format: user@example.com'
        ),
      };
    }
  }

  // Validate BCC if provided
  if (params.bcc && params.bcc.length > 0) {
    const bccValidation = validateEmails(params.bcc);
    if (!bccValidation.valid) {
      return {
        valid: false,
        error: createValidationError(
          'BCC email address',
          bccValidation.invalidEmail || '',
          'Must be in format: user@example.com'
        ),
      };
    }
  }

  // Validate From if provided
  if (params.from && !validateEmail(params.from)) {
    return {
      valid: false,
      error: createValidationError(
        'From email address',
        params.from,
        'Must be in format: user@example.com'
      ),
    };
  }

  // Validate recipient counts
  const toCountValidation = validateRecipientCount(params.to.length, 'to');
  if (!toCountValidation.valid) {
    return { valid: false, error: toCountValidation.error };
  }

  if (params.cc) {
    const ccCountValidation = validateRecipientCount(params.cc.length, 'cc');
    if (!ccCountValidation.valid) {
      return { valid: false, error: ccCountValidation.error };
    }
  }

  if (params.bcc) {
    const bccCountValidation = validateRecipientCount(params.bcc.length, 'bcc');
    if (!bccCountValidation.valid) {
      return { valid: false, error: bccCountValidation.error };
    }
  }

  // Validate subject
  const subjectValidation = validateSubject(params.subject);
  if (!subjectValidation.valid) {
    return { valid: false, error: subjectValidation.error };
  }

  // Validate body
  const bodyValidation = validateBody(params.body, params.html);
  if (!bodyValidation.valid) {
    return { valid: false, error: bodyValidation.error };
  }

  // Validate tag if provided
  if (params.tag && !validateTag(params.tag)) {
    return {
      valid: false,
      error: createValidationError(
        'tag',
        params.tag,
        'Must contain only letters, numbers, dashes, and underscores (max 100 characters)'
      ),
    };
  }

  return { valid: true };
}
