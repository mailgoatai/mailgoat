/**
 * Input validation utilities for MailGoat CLI
 *
 * @deprecated This file is deprecated. Use ValidationService from validation-service.ts instead.
 * These functions are kept for backward compatibility but will be removed in a future version.
 *
 * Migration guide:
 * - Import { validationService } from './validation-service'
 * - Use validationService.validateEmail() instead of validateEmail()
 * - Use validationService.validateSendOptions() instead of validateSendInputs()
 */

import { validationService } from './validation-service';
import { debugLogger } from './debug';

/**
 * @deprecated Use validationService.validateEmail() instead
 */
export function validateEmail(email: string): boolean {
  const result = validationService.validateEmail(email);
  return result.valid;
}

/**
 * @deprecated Use validationService.validateEmails() instead
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
 * @deprecated Use validationService.validateUrl() instead
 */
export function validateUrl(url: string): boolean {
  const result = validationService.validateUrl(url);
  return result.valid;
}

/**
 * @deprecated Use validationService.validateApiKey() instead
 */
export function validateApiKey(key: string): boolean {
  const result = validationService.validateApiKey(key);
  return result.valid;
}

/**
 * @deprecated Use validationService.validateSubject() instead
 */
export function validateSubject(subject: string): { valid: boolean; error?: string } {
  const result = validationService.validateSubject(subject);
  return { valid: result.valid, error: result.error };
}

/**
 * @deprecated Use validationService.validateBody() instead
 */
export function validateBody(body?: string, html?: string): { valid: boolean; error?: string } {
  const result = validationService.validateBody(body, html);
  return { valid: result.valid, error: result.error };
}

/**
 * @deprecated Use validationService.validateTag() instead
 */
export function validateTag(tag: string): boolean {
  const result = validationService.validateTag(tag);
  return result.valid;
}

/**
 * @deprecated Use validationService.validateFilePath() instead
 */
export function validateFilePath(path: string): { valid: boolean; error?: string } {
  const result = validationService.validateFilePath(path);
  return { valid: result.valid, error: result.error };
}

/**
 * @deprecated Use validationService.validateRecipientCount() instead
 */
export function validateRecipientCount(
  count: number,
  type: 'to' | 'cc' | 'bcc'
): { valid: boolean; error?: string } {
  const result = validationService.validateRecipientCount(count, type);
  return { valid: result.valid, error: result.error };
}

/**
 * @deprecated Create validation errors using ValidationResult from ValidationService
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
 * @deprecated Use validationService.validateSendOptions() instead
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
  debugLogger.log(
    'validation',
    'Warning: validateSendInputs is deprecated. Use ValidationService instead.'
  );

  const result = validationService.validateSendOptions(params);
  return { valid: result.valid, error: result.error };
}
