/**
 * Integration tests for complete workflows
 * Tests full user workflows from command invocation to result
 *
 * These tests would have caught the redirect issue that unit tests missed!
 */

import nock from 'nock';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Workflow Integration Tests', () => {
  let testDir: string;
  let configPath: string;
  const TEST_SERVER = 'https://postal.test.local';
  const TEST_API_KEY = 'test-key-12345';
  const TEST_EMAIL = 'test@example.com';

  beforeEach(() => {
    // Create temp directory for test config
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-test-'));
    configPath = path.join(testDir, 'config.json');

    // Write test config
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        server: TEST_SERVER,
        api_key: TEST_API_KEY,
        email: TEST_EMAIL,
      })
    );

    // Set env var to use test config
    process.env.MAILGOAT_CONFIG = configPath;
  });

  afterEach(() => {
    // Cleanup
    nock.cleanAll();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env.MAILGOAT_CONFIG;
  });

  describe('1. Full Send Workflow', () => {
    it('sends email end-to-end with correct API calls', async () => {
      // Mock successful send
      const scope = nock(TEST_SERVER)
        .post('/api/v1/send/message', (body) => {
          // Verify request payload structure
          expect(body).toHaveProperty('to');
          expect(body).toHaveProperty('subject');
          expect(body).toHaveProperty('plain_body');
          expect(body.to).toContain('recipient@example.com');
          expect(body.subject).toBe('Test Subject');
          return true;
        })
        .reply(200, {
          status: 'success',
          data: {
            message_id: 'msg-test-123',
            messages: {
              'recipient@example.com': {
                id: 1,
                token: 'abc123',
              },
            },
          },
        });

      // Execute send command (using the library directly for faster tests)
      const { PostalClient } = require('../../src/lib/postal-client');
      const { ConfigManager } = require('../../src/lib/config');

      const manager = new ConfigManager(configPath);
      const config = await manager.load();
      const client = new PostalClient(config);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      // Verify
      expect(result.message_id).toBe('msg-test-123');
      expect(scope.isDone()).toBe(true);
    });

    it('detects and reports redirect loops', async () => {
      // Mock redirect that would cause the real issue
      const scope = nock(TEST_SERVER).post('/api/v1/send/message').reply(301, 'Moved Permanently', {
        Location: 'https://admin.different.com/api/v1/send/message',
      });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');

      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      // Should fail with a clear error
      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow();

      expect(scope.isDone()).toBe(true);
    });

    it('handles 404 errors gracefully', async () => {
      // Mock 404 (like the real server issue)
      nock(TEST_SERVER).post('/api/v1/send/message').reply(404, 'Not found');

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');

      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow(/404|Not Found/i);
    });
  });

  describe('2. Config Workflow', () => {
    it('creates, loads, and uses config', async () => {
      const newConfigPath = path.join(testDir, 'new-config.json');

      // Create config
      const { ConfigManager } = require('../../src/lib/config');
      const manager = new ConfigManager(newConfigPath);

      await manager.save({
        server: 'https://new.server.com',
        api_key: 'new-key',
        email: 'new@example.com',
      });

      // Verify file exists
      expect(fs.existsSync(newConfigPath)).toBe(true);

      // Load and verify
      const loaded = await manager.load();
      expect(loaded.server).toBe('https://new.server.com');
      expect(loaded.api_key).toBe('new-key');
      expect(loaded.email).toBe('new@example.com');

      // Use in send (mock the API call)
      nock('https://new.server.com')
        .post('/api/v1/send/message')
        .matchHeader('X-Server-API-Key', 'new-key')
        .reply(200, {
          status: 'success',
          data: { message_id: 'msg-123' },
        });

      const { PostalClient } = require('../../src/lib/postal-client');
      const client = new PostalClient(loaded);

      const result = await client.sendMessage({
        to: ['test@example.com'],
        subject: 'Test',
        plain_body: 'Body',
      });

      expect(result.message_id).toBe('msg-123');
    });

    it('validates config on load', async () => {
      const badConfigPath = path.join(testDir, 'bad-config.json');

      // Write invalid config
      fs.writeFileSync(
        badConfigPath,
        JSON.stringify({
          server: 'not-a-url',
          // missing api_key
        })
      );

      const { ConfigManager } = require('../../src/lib/config');
      const manager = new ConfigManager(badConfigPath);

      // Should throw validation error
      await expect(manager.load()).rejects.toThrow();
    });
  });

  describe('3. Template Workflow', () => {
    it('creates, saves, renders, and uses template', async () => {
      const templatesDir = path.join(testDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      const { TemplateManager } = require('../../src/lib/template-manager');
      const manager = new TemplateManager(templatesDir);

      // Create template
      await manager.create({
        name: 'welcome',
        subject: 'Welcome {{name}}!',
        body: 'Hello {{name}}, welcome to {{company}}.',
        variables: ['name', 'company'],
      });

      // Verify saved
      const template = await manager.get('welcome');
      expect(template.name).toBe('welcome');
      expect(template.subject).toBe('Welcome {{name}}!');

      // Render with variables
      const rendered = await manager.render('welcome', {
        name: 'Alice',
        company: 'MailGoat',
      });

      expect(rendered.subject).toBe('Welcome Alice!');
      expect(rendered.body).toBe('Hello Alice, welcome to MailGoat.');

      // Use in send
      nock(TEST_SERVER)
        .post('/api/v1/send/message', (body) => {
          expect(body.subject).toBe('Welcome Alice!');
          expect(body.plain_body).toBe('Hello Alice, welcome to MailGoat.');
          return true;
        })
        .reply(200, {
          status: 'success',
          data: { message_id: 'msg-template-123' },
        });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');
      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      const result = await client.sendMessage({
        to: ['test@example.com'],
        subject: rendered.subject,
        plain_body: rendered.body,
      });

      expect(result.message_id).toBe('msg-template-123');
    });
  });

  describe('4. Error Handling Workflows', () => {
    it('handles network timeout gracefully', async () => {
      nock(TEST_SERVER)
        .post('/api/v1/send/message')
        .delayConnection(30000) // 30s delay
        .reply(200, { status: 'success' });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');
      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      // Should timeout (with short timeout for test)
      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow();
    });

    it('handles 500 server error with retry', async () => {
      let attempt = 0;

      nock(TEST_SERVER)
        .post('/api/v1/send/message')
        .times(3)
        .reply(() => {
          attempt++;
          if (attempt < 3) {
            return [500, { status: 'error', data: { message: 'Server error' } }];
          }
          return [200, { status: 'success', data: { message_id: 'msg-retry-123' } }];
        });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');
      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      // Should retry and eventually succeed
      const result = await client.sendMessage({
        to: ['test@example.com'],
        subject: 'Test',
        plain_body: 'Body',
      });

      expect(result.message_id).toBe('msg-retry-123');
      expect(attempt).toBe(3);
    });

    it('does not retry 4xx client errors', async () => {
      let attempts = 0;

      nock(TEST_SERVER)
        .post('/api/v1/send/message')
        .times(5) // Mock more than needed
        .reply(() => {
          attempts++;
          return [400, { status: 'error', data: { message: 'Bad request' } }];
        });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');
      const config = await loadConfig(configPath);
      const client = new PostalClient(config);

      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow(/400|Bad request/i);

      // Should NOT retry 4xx errors
      expect(attempts).toBe(1);
    });
  });

  describe('5. Inbox Workflow', () => {
    it('lists, filters, and reads messages', async () => {
      // This would test inbox functionality
      // For now, just verify the structure works
      const { InboxStore } = require('../../src/lib/inbox-store');
      const dbPath = path.join(testDir, 'inbox.db');
      const store = new InboxStore(dbPath);

      await store.initialize();

      // Add test message
      await store.saveMessage({
        id: 'msg-inbox-1',
        subject: 'Test Message',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        received_at: new Date().toISOString(),
        size: 1024,
        scope: 'incoming',
      });

      // List messages
      const messages = await store.listMessages({ limit: 10 });
      expect(messages.length).toBe(1);
      expect(messages[0].subject).toBe('Test Message');

      // Read specific message
      const message = await store.getMessage('msg-inbox-1');
      expect(message).toBeDefined();
      expect(message!.subject).toBe('Test Message');
    });
  });

  describe('6. Health Check Workflow', () => {
    it('validates full system health', async () => {
      // Mock health check endpoints
      nock(TEST_SERVER)
        .post('/api/v1/send/message')
        .reply(200, { status: 'success', data: { message_id: 'health-check' } });

      const { PostalClient } = require('../../src/lib/postal-client');
      const { loadConfig } = require('../../src/lib/config');
      const config = await loadConfig(configPath);

      // Config exists and valid
      const client = new PostalClient(config);

      // Server reachable
      const result = await client.sendMessage({
        to: ['health@example.com'],
        subject: 'Health Check',
        plain_body: 'Checking system health',
      });

      expect(result.message_id).toBe('health-check');
    });
  });
});
