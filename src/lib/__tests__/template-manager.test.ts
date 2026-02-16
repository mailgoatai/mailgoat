/**
 * TemplateManager Unit Tests
 *
 * Tests for email template management and variable substitution.
 */

import { TemplateManager } from '../template-manager';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('TemplateManager', () => {
  let manager: TemplateManager;
  const mockTemplatesDir = '/test/.mailgoat/templates';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new TemplateManager(mockTemplatesDir);
  });

  describe('constructor', () => {
    it('should use provided templates directory', () => {
      const customDir = '/custom/templates';
      const customManager = new TemplateManager(customDir);
      expect(customManager).toBeDefined();
    });

    it('should use default directory if not provided', () => {
      const defaultManager = new TemplateManager();
      expect(defaultManager).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save template to file', () => {
      const template = {
        name: 'welcome',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, welcome to our service.',
      };

      mockedFs.existsSync.mockReturnValue(false);

      manager.save(template);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        mockTemplatesDir,
        expect.objectContaining({ recursive: true, mode: 0o700 })
      );

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'welcome.yml'),
        expect.stringContaining('name: welcome'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should reject invalid template names', () => {
      const invalidTemplates = [
        { name: '', subject: 'Test', body: 'Test' },
        { name: 'invalid name', subject: 'Test', body: 'Test' },
        { name: 'invalid@name', subject: 'Test', body: 'Test' },
        { name: 'a'.repeat(101), subject: 'Test', body: 'Test' },
      ];

      invalidTemplates.forEach((template) => {
        expect(() => manager.save(template)).toThrow();
      });
    });

    it('should accept valid template names', () => {
      const validNames = ['welcome', 'invoice-reminder', 'order_123', 'TEST'];

      validNames.forEach((name) => {
        const template = {
          name,
          subject: 'Test',
          body: 'Test body',
        };

        mockedFs.existsSync.mockReturnValue(false);
        expect(() => manager.save(template)).not.toThrow();
      });
    });

    it('should set timestamps when saving', () => {
      const template = {
        name: 'test',
        subject: 'Test',
        body: 'Test body',
      };

      mockedFs.existsSync.mockReturnValue(false);

      manager.save(template);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('created_at'),
        expect.any(Object)
      );
    });

    it('should create templates directory if it does not exist', () => {
      const template = {
        name: 'test',
        subject: 'Test',
        body: 'Test body',
      };

      mockedFs.existsSync.mockReturnValue(false);

      manager.save(template);

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load template from file', () => {
      const templateYaml = `
name: welcome
subject: Welcome {{name}}!
body: Hello {{name}}, welcome to our service.
description: Welcome email template
created_at: '2024-01-01T00:00:00.000Z'
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(templateYaml);

      const template = manager.load('welcome');

      expect(template.name).toBe('welcome');
      expect(template.subject).toBe('Welcome {{name}}!');
      expect(template.body).toContain('Hello {{name}}');
    });

    it('should throw error if template does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => manager.load('nonexistent')).toThrow('Template not found');
    });

    it('should handle YAML parsing errors', () => {
      const invalidYaml = `
name: welcome
subject: Test
  invalid: nesting
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      expect(() => manager.load('welcome')).toThrow();
    });

    it('should validate template name before loading', () => {
      expect(() => manager.load('invalid name')).toThrow();
      expect(() => manager.load('')).toThrow();
    });
  });

  describe('list', () => {
    it('should list all templates', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'welcome.yml',
        'invoice.yml',
        'reminder.yml',
        'notatemplate.txt',
      ] as any);

      const templates = manager.list();

      expect(templates).toEqual(['welcome', 'invoice', 'reminder']);
    });

    it('should return empty array if directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const templates = manager.list();

      expect(templates).toEqual([]);
    });

    it('should handle errors when reading directory', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => manager.list()).toThrow('Permission denied');
    });
  });

  describe('delete', () => {
    it('should delete template file', () => {
      mockedFs.existsSync.mockReturnValue(true);

      manager.delete('welcome');

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'welcome.yml')
      );
    });

    it('should throw error if template does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => manager.delete('nonexistent')).toThrow('Template not found');
    });

    it('should validate template name before deleting', () => {
      expect(() => manager.delete('invalid name')).toThrow();
    });
  });

  describe('exists', () => {
    it('should return true if template exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      expect(manager.exists('welcome')).toBe(true);
    });

    it('should return false if template does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(manager.exists('nonexistent')).toBe(false);
    });

    it('should validate template name', () => {
      expect(() => manager.exists('invalid name')).toThrow();
    });
  });

  describe('render', () => {
    it('should render template with variables', () => {
      const template = {
        name: 'welcome',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, your email is {{email}}.',
      };

      const variables = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const rendered = manager.render(template, variables);

      expect(rendered.subject).toBe('Welcome John Doe!');
      expect(rendered.body).toBe('Hello John Doe, your email is john@example.com.');
    });

    it('should render HTML template', () => {
      const template = {
        name: 'newsletter',
        subject: 'Newsletter',
        html: '<h1>Hello {{name}}</h1><p>Welcome to our newsletter.</p>',
      };

      const variables = { name: 'Jane' };

      const rendered = manager.render(template, variables);

      expect(rendered.html).toBe('<h1>Hello Jane</h1><p>Welcome to our newsletter.</p>');
    });

    it('should handle missing variables gracefully', () => {
      const template = {
        name: 'test',
        subject: 'Hello {{name}}',
        body: 'Your email is {{email}}',
      };

      const variables = { name: 'John' }; // email missing

      const rendered = manager.render(template, variables);

      expect(rendered.subject).toBe('Hello John');
      expect(rendered.body).toContain('John');
    });

    it('should not modify variables in subject/body/html if no template variables', () => {
      const template = {
        name: 'plain',
        subject: 'No variables here',
        body: 'Plain text body',
      };

      const rendered = manager.render(template, {});

      expect(rendered.subject).toBe('No variables here');
      expect(rendered.body).toBe('Plain text body');
    });

    it('should handle numeric and boolean variables', () => {
      const template = {
        name: 'test',
        subject: 'Order #{{orderId}}',
        body: 'Status: {{isPaid}}',
      };

      const variables = {
        orderId: 12345,
        isPaid: true,
      };

      const rendered = manager.render(template, variables);

      expect(rendered.subject).toBe('Order #12345');
      expect(rendered.body).toContain('true');
    });

    it('should preserve other template fields', () => {
      const template = {
        name: 'test',
        subject: 'Test',
        body: 'Body',
        from: 'sender@example.com',
        cc: ['cc@example.com'],
        tag: 'test-tag',
      };

      const rendered = manager.render(template, {});

      expect(rendered.from).toBe('sender@example.com');
      expect(rendered.cc).toEqual(['cc@example.com']);
      expect(rendered.tag).toBe('test-tag');
    });
  });

  describe('integration: save, load, render', () => {
    it('should save, load, and render template correctly', () => {
      const template = {
        name: 'invoice',
        subject: 'Invoice #{{invoiceNumber}}',
        body: 'Dear {{customerName}}, your invoice for ${{amount}} is ready.',
        from: 'billing@example.com',
        tag: 'invoice',
      };

      mockedFs.existsSync.mockReturnValue(false);

      // Save
      manager.save(template);

      // Mock load
      const savedYaml = `
name: invoice
subject: 'Invoice #{{invoiceNumber}}'
body: 'Dear {{customerName}}, your invoice for ${{amount}} is ready.'
from: billing@example.com
tag: invoice
created_at: '2024-01-01T00:00:00.000Z'
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(savedYaml);

      // Load
      const loaded = manager.load('invoice');

      // Render
      const variables = {
        invoiceNumber: 1001,
        customerName: 'Jane Doe',
        amount: 99.99,
      };

      const rendered = manager.render(loaded, variables);

      expect(rendered.subject).toBe('Invoice #1001');
      expect(rendered.body).toContain('Jane Doe');
      expect(rendered.body).toContain('99.99');
      expect(rendered.from).toBe('billing@example.com');
      expect(rendered.tag).toBe('invoice');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in variables', () => {
      const template = {
        name: 'test',
        subject: 'Hello {{name}}',
        body: 'Message: {{message}}',
      };

      const variables = {
        name: 'John <script>alert("xss")</script>',
        message: 'Test & "quotes"',
      };

      const rendered = manager.render(template, variables);

      // Handlebars should escape HTML by default
      expect(rendered.subject).toContain('John');
    });

    it('should handle very long template names at limit', () => {
      const longName = 'a'.repeat(100);
      const template = {
        name: longName,
        subject: 'Test',
        body: 'Test',
      };

      mockedFs.existsSync.mockReturnValue(false);

      expect(() => manager.save(template)).not.toThrow();
    });
  });
});
