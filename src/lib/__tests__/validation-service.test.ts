/**
 * ValidationService Unit Tests
 *
 * Comprehensive tests for centralized validation logic.
 */

import { ValidationService, validationService } from '../validation-service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example.co.uk',
        'test123@subdomain.example.com',
      ];

      validEmails.forEach((email) => {
        const result = service.validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
      ];

      invalidEmails.forEach((email) => {
        const result = service.validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid email');
      });
    });

    it('should provide field name in validation result', () => {
      const result = service.validateEmail('invalid');
      expect(result.field).toBe('email');
    });
  });

  describe('validateEmails', () => {
    it('should accept array of valid emails', () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      const result = service.validateEmails(emails);
      expect(result.valid).toBe(true);
    });

    it('should reject if any email is invalid', () => {
      const emails = ['test@example.com', 'invalid'];
      const result = service.validateEmails(emails);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should reject empty array', () => {
      const result = service.validateEmails([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one email');
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://subdomain.example.com',
        'https://example.com:8080',
        'https://example.com/path',
      ];

      validUrls.forEach((url) => {
        const result = service.validateUrl(url);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = ['not-a-url', 'ftp://example.com', 'example.com', ''];

      invalidUrls.forEach((url) => {
        const result = service.validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid URL');
      });
    });
  });

  describe('validateApiKey', () => {
    it('should accept valid API keys', () => {
      const validKeys = ['proj_abc123def456', 'sk_test_1234567890', 'key_' + 'a'.repeat(32)];

      validKeys.forEach((key) => {
        const result = service.validateApiKey(key);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject short API keys', () => {
      const result = service.validateApiKey('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject empty API key', () => {
      const result = service.validateApiKey('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSubject', () => {
    it('should accept valid subjects', () => {
      const result = service.validateSubject('Test Subject');
      expect(result.valid).toBe(true);
    });

    it('should reject empty subject', () => {
      const result = service.validateSubject('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Subject is required');
    });

    it('should reject whitespace-only subject', () => {
      const result = service.validateSubject('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject very long subjects', () => {
      const longSubject = 'a'.repeat(1000);
      const result = service.validateSubject(longSubject);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateBody', () => {
    it('should accept valid body text', () => {
      const result = service.validateBody('Email body content');
      expect(result.valid).toBe(true);
    });

    it('should accept empty body', () => {
      const result = service.validateBody('');
      expect(result.valid).toBe(true);
    });

    it('should reject very long bodies', () => {
      const longBody = 'a'.repeat(2000000); // 2MB
      const result = service.validateBody(longBody);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('validateTag', () => {
    it('should accept valid tags', () => {
      const validTags = ['newsletter', 'test-email', 'campaign_2024'];

      validTags.forEach((tag) => {
        const result = service.validateTag(tag);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject tags with spaces', () => {
      const result = service.validateTag('invalid tag');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('special characters');
    });

    it('should reject empty tag', () => {
      const result = service.validateTag('');
      expect(result.valid).toBe(false);
    });

    it('should reject very long tags', () => {
      const longTag = 'a'.repeat(100);
      const result = service.validateTag(longTag);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      const validPaths = ['/tmp/file.txt', './relative/file.pdf', '../parent/file.doc', 'file.txt'];

      validPaths.forEach((path) => {
        const result = service.validateFilePath(path);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject empty path', () => {
      const result = service.validateFilePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject paths with null bytes', () => {
      const result = service.validateFilePath('file\0.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file path');
    });
  });

  describe('validateRecipientCount', () => {
    it('should accept valid recipient counts', () => {
      const result = service.validateRecipientCount(50, 'to');
      expect(result.valid).toBe(true);
    });

    it('should reject when exceeding limit', () => {
      const result = service.validateRecipientCount(150, 'to');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many');
      expect(result.error).toContain('150');
    });

    it('should reject CC recipients exceeding limit', () => {
      const result = service.validateRecipientCount(150, 'cc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CC');
    });

    it('should reject BCC recipients exceeding limit', () => {
      const result = service.validateRecipientCount(150, 'bcc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BCC');
    });
  });

  describe('validateSendOptions', () => {
    it('should accept valid send options', () => {
      const options = {
        to: ['user@example.com'],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should reject missing to field', () => {
      const options = {
        to: [],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('recipient');
    });

    it('should reject invalid to emails', () => {
      const options = {
        to: ['invalid'],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
    });

    it('should reject missing subject', () => {
      const options = {
        to: ['user@example.com'],
        subject: '',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Subject');
    });

    it('should accept options with CC', () => {
      const options = {
        to: ['user@example.com'],
        cc: ['cc@example.com'],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid CC emails', () => {
      const options = {
        to: ['user@example.com'],
        cc: ['invalid'],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
    });

    it('should accept options with BCC', () => {
      const options = {
        to: ['user@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid from email', () => {
      const options = {
        to: ['user@example.com'],
        from: 'invalid',
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid tag', () => {
      const options = {
        to: ['user@example.com'],
        subject: 'Test',
        body: 'Hello',
        tag: 'invalid tag',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
    });

    it('should validate total recipient count', () => {
      const options = {
        to: Array(60).fill('user@example.com'),
        cc: Array(30).fill('cc@example.com'),
        bcc: Array(20).fill('bcc@example.com'),
        subject: 'Test',
        body: 'Hello',
      };
      const result = service.validateSendOptions(options);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('110');
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const config = {
        server: 'https://postal.example.com',
        fromAddress: 'user@example.com',
        api_key: 'proj_abc123def456',
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid server URL', () => {
      const config = {
        server: 'not-a-url',
        fromAddress: 'user@example.com',
        api_key: 'proj_abc123def456',
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('server');
    });

    it('should reject invalid email', () => {
      const config = {
        server: 'https://postal.example.com',
        fromAddress: 'invalid',
        api_key: 'proj_abc123def456',
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('fromAddress');
    });

    it('should reject invalid API key', () => {
      const config = {
        server: 'https://postal.example.com',
        fromAddress: 'user@example.com',
        api_key: 'short',
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('api_key');
    });

    it('should validate webhook URL if provided', () => {
      const config = {
        server: 'https://postal.example.com',
        fromAddress: 'user@example.com',
        api_key: 'proj_abc123def456',
        webhook: {
          url: 'not-a-url',
        },
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('webhook.url');
    });

    it('should accept valid webhook config', () => {
      const config = {
        server: 'https://postal.example.com',
        fromAddress: 'user@example.com',
        api_key: 'proj_abc123def456',
        webhook: {
          url: 'https://webhook.example.com',
          secret: 'webhook_secret_key',
        },
      };
      const result = service.validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(validationService).toBeInstanceOf(ValidationService);
    });

    it('should be reusable across calls', () => {
      const result1 = validationService.validateEmail('test@example.com');
      const result2 = validationService.validateEmail('test@example.com');
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });
});
