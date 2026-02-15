/**
 * Integration tests for input validators
 * Tests validation logic with realistic scenarios
 */

import {
  validateEmail,
  validateEmails,
  validateUrl,
  validateApiKey,
  validateSubject,
  validateBody,
  validateTag,
  validateRecipientCount,
  validateSendInputs,
} from '../../src/lib/validators';

describe('Validators Integration Tests', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.com',
        'user_name@example.co.uk',
        'a@b.c',
        '123@456.com',
      ];

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user',
        'user@.com',
        'user..name@example.com',
        'user @example.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateEmails', () => {
    it('should validate multiple correct emails', () => {
      const result = validateEmails(['user1@example.com', 'user2@example.com']);

      expect(result.valid).toBe(true);
      expect(result.invalidEmail).toBeUndefined();
    });

    it('should detect first invalid email in array', () => {
      const result = validateEmails(['valid@example.com', 'invalid', 'also-valid@example.com']);

      expect(result.valid).toBe(false);
      expect(result.invalidEmail).toBe('invalid');
    });

    it('should reject empty array', () => {
      const result = validateEmails([]);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'example.com',
        'postal.example.com',
        'https://api.example.com/v1',
        'https://example.com:8443',
      ];

      validUrls.forEach((url) => {
        expect(validateUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = ['', 'not a url', 'ftp://invalid', '://broken'];

      invalidUrls.forEach((url) => {
        expect(validateUrl(url)).toBe(false);
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API keys', () => {
      const validKeys = [
        'abcdef1234567890',
        'test-api-key-1234',
        'ABC_123_DEF_456',
        'a'.repeat(32), // Long key
      ];

      validKeys.forEach((key) => {
        expect(validateApiKey(key)).toBe(true);
      });
    });

    it('should reject invalid API keys', () => {
      const invalidKeys = [
        '', // Empty
        'short', // Too short
        'has space', // Contains space
        'has@symbol', // Invalid character
      ];

      invalidKeys.forEach((key) => {
        expect(validateApiKey(key)).toBe(false);
      });
    });
  });

  describe('validateSubject', () => {
    it('should validate correct subjects', () => {
      const validSubjects = [
        'Normal subject',
        'Subject with 123 numbers',
        'Subject with emojis 🎉',
        'A'.repeat(998), // Maximum length
      ];

      validSubjects.forEach((subject) => {
        const result = validateSubject(subject);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty subject', () => {
      const result = validateSubject('');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/required/i);
    });

    it('should reject subject that is too long', () => {
      const result = validateSubject('A'.repeat(1001));

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too long|1000/i);
    });
  });

  describe('validateBody', () => {
    it('should validate plain text body', () => {
      const result = validateBody('Plain text body', undefined);

      expect(result.valid).toBe(true);
    });

    it('should validate HTML body', () => {
      const result = validateBody(undefined, '<h1>HTML body</h1>');

      expect(result.valid).toBe(true);
    });

    it('should accept both plain and HTML', () => {
      const result = validateBody('Plain text', '<h1>HTML</h1>');

      expect(result.valid).toBe(true);
    });

    it('should reject when both are missing', () => {
      const result = validateBody(undefined, undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least one/i);
    });

    it('should reject when both are empty', () => {
      const result = validateBody('', '');

      expect(result.valid).toBe(false);
    });

    it('should reject body that is too large', () => {
      const largeBody = 'A'.repeat(11 * 1024 * 1024); // 11MB
      const result = validateBody(largeBody, undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too large|10MB/i);
    });
  });

  describe('validateTag', () => {
    it('should validate correct tags', () => {
      const validTags = [
        'simple-tag',
        'tag_with_underscore',
        'tag123',
        'a',
        'A'.repeat(100), // Maximum length
      ];

      validTags.forEach((tag) => {
        expect(validateTag(tag)).toBe(true);
      });
    });

    it('should reject invalid tags', () => {
      const invalidTags = [
        'tag with space',
        'tag@symbol',
        'tag!exclaim',
        'A'.repeat(101), // Too long
      ];

      invalidTags.forEach((tag) => {
        expect(validateTag(tag)).toBe(false);
      });
    });
  });

  describe('validateRecipientCount', () => {
    it('should validate recipient count within limits', () => {
      const validCounts = [1, 10, 25, 50];

      validCounts.forEach((count) => {
        const result = validateRecipientCount(count, 'to');
        expect(result.valid).toBe(true);
      });
    });

    it('should reject recipient count of 0', () => {
      const result = validateRecipientCount(0, 'to');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least one/i);
    });

    it('should reject recipient count over limit', () => {
      const result = validateRecipientCount(51, 'to');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/maximum|50/i);
    });
  });

  describe('validateSendInputs (Integration)', () => {
    it('should validate complete valid send request', () => {
      const result = validateSendInputs({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate send with CC and BCC', () => {
      const result = validateSendInputs({
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate send with HTML body', () => {
      const result = validateSendInputs({
        to: ['recipient@example.com'],
        subject: 'Test',
        html: '<h1>HTML body</h1>',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate send with custom from', () => {
      const result = validateSendInputs({
        to: ['recipient@example.com'],
        from: 'custom@example.com',
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate send with tag', () => {
      const result = validateSendInputs({
        to: ['recipient@example.com'],
        subject: 'Test',
        body: 'Test',
        tag: 'test-tag',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid To email', () => {
      const result = validateSendInputs({
        to: ['invalid-email'],
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid.*email/i);
    });

    it('should reject invalid CC email', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        cc: ['invalid-email'],
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/cc.*email/i);
    });

    it('should reject invalid BCC email', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        bcc: ['invalid-email'],
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/bcc.*email/i);
    });

    it('should reject invalid From email', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        from: 'invalid-email',
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/from.*email/i);
    });

    it('should reject too many To recipients', () => {
      const tooMany = Array(51)
        .fill(null)
        .map((_, i) => `user${i}@example.com`);
      const result = validateSendInputs({
        to: tooMany,
        subject: 'Test',
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too many/i);
    });

    it('should reject invalid subject', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        subject: '', // Empty
        body: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/subject/i);
    });

    it('should reject missing body', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        subject: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/body|content/i);
    });

    it('should reject invalid tag', () => {
      const result = validateSendInputs({
        to: ['valid@example.com'],
        subject: 'Test',
        body: 'Test',
        tag: 'invalid tag with spaces',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/tag/i);
    });

    it('should handle multiple validation errors (first one reported)', () => {
      const result = validateSendInputs({
        to: ['invalid-email'],
        cc: ['also-invalid'],
        subject: '',
        body: '',
      });

      // Should report first error encountered
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
