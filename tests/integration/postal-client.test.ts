/**
 * Integration tests for PostalClient
 * Tests full send → read → error scenarios with mock Postal server
 */

import { PostalClient } from '../../src/lib/postal-client';
import { MailGoatConfig } from '../../src/lib/config';
import { createMockPostalServer, generateMessageId, MockPostalServer } from './helpers/mock-postal';
import { TEST_CONFIG, wait } from './helpers/test-config';

describe('PostalClient Integration Tests', () => {
  let mockServer: MockPostalServer;
  let client: PostalClient;
  let config: MailGoatConfig;

  beforeEach(() => {
    config = {
      server: 'https://postal.example.com',
      fromAddress: 'test@example.com',
      email: 'test@example.com',
      api_key: 'test-api-key',
    };

    mockServer = createMockPostalServer({
      serverUrl: config.server,
      apiKey: config.api_key,
    });
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      client = new PostalClient(config);
    });

    it('should send a simple email successfully', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      expect(result).toBeDefined();
      expect(result.message_id).toBe(messageId);
      expect(result.messages['recipient@example.com']).toBeDefined();
      expect(result.messages['recipient@example.com']).toHaveProperty('id');
      expect(result.messages['recipient@example.com']).toHaveProperty('token');
    });

    it('should send email with multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(recipients, messageId);

      const result = await client.sendMessage({
        to: recipients,
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      expect(result.message_id).toBe(messageId);
      expect(Object.keys(result.messages)).toHaveLength(3);
      recipients.forEach((email) => {
        expect(result.messages[email]).toBeDefined();
      });
    });

    it('should send email with HTML body', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        html_body: '<h1>Test HTML</h1>',
      });

      expect(result.message_id).toBe(messageId);
    });

    it('should send email with CC and BCC', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(
        ['to@example.com', 'cc@example.com', 'bcc@example.com'],
        messageId
      );

      const result = await client.sendMessage({
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      expect(result.message_id).toBe(messageId);
    });

    it('should send email with custom from address', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        from: 'custom@example.com',
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      expect(result.message_id).toBe(messageId);
    });

    it('should send email with tag', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
        tag: 'test-tag',
      });

      expect(result.message_id).toBe(messageId);
    });

    it('should send email with attachments', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
        attachments: [
          {
            name: 'test.txt',
            content_type: 'text/plain',
            data: Buffer.from('Test attachment').toString('base64'),
          },
        ],
      });

      expect(result.message_id).toBe(messageId);
    });
  });

  describe('getMessage', () => {
    beforeEach(() => {
      client = new PostalClient(config);
    });

    it('should retrieve message details', async () => {
      const messageId = generateMessageId();
      mockServer.mockGetMessage(messageId, {
        id: 1000,
        token: 'test-token',
        plain_body: 'Test message body',
      });

      const result = await client.getMessage(messageId);

      expect(result).toBeDefined();
      expect(result.id).toBe(1000);
      expect(result.token).toBe('test-token');
      expect(result.plain_body).toBe('Test message body');
    });

    it('should retrieve message with status expansion', async () => {
      const messageId = generateMessageId();
      mockServer.mockGetMessage(messageId, {
        id: 1000,
        token: 'test-token',
        status: {
          status: 'sent',
          held: false,
        },
      });

      const result = await client.getMessage(messageId, ['status']);

      expect(result.status).toBeDefined();
      expect(result.status?.status).toBe('sent');
      expect(result.status?.held).toBe(false);
    });

    it('should throw error for non-existent message', async () => {
      const messageId = generateMessageId();
      mockServer.mockGetMessageNotFound(messageId);

      await expect(client.getMessage(messageId)).rejects.toThrow(/not found/i);
    });
  });

  describe('getDeliveries', () => {
    beforeEach(() => {
      client = new PostalClient(config);
    });

    it('should retrieve message deliveries', async () => {
      const messageId = generateMessageId();
      mockServer.mockGetDeliveries(messageId, [
        {
          id: 1,
          status: 'Sent',
          details: 'Delivered successfully',
          time: Date.now() / 1000,
        },
      ]);

      const result = await client.getDeliveries(messageId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Sent');
    });

    it('should retrieve multiple deliveries for message with multiple recipients', async () => {
      const messageId = generateMessageId();
      mockServer.mockGetDeliveries(messageId, [
        { id: 1, status: 'Sent', time: Date.now() / 1000 },
        { id: 2, status: 'Sent', time: Date.now() / 1000 },
        { id: 3, status: 'Sent', time: Date.now() / 1000 },
      ]);

      const result = await client.getDeliveries(messageId);

      expect(result).toHaveLength(3);
      result.forEach((delivery) => {
        expect(delivery.status).toBe('Sent');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new PostalClient(config);
    });

    it('should handle authentication errors', async () => {
      mockServer.mockSendAuthError();

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow(/authentication failed/i);
    });

    it('should handle validation errors', async () => {
      mockServer.mockSendValidationError('NoRecipients', 'No recipients specified');

      await expect(
        client.sendMessage({
          to: [],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow(/no recipients/i);
    });

    it('should handle unauthenticated from address error', async () => {
      mockServer.mockSendValidationError(
        'UnauthenticatedFromAddress',
        'From address not authorized'
      );

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          from: 'unauthorized@example.com',
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow(/not authorized/i);
    });

    it('should handle transport-level failures with helpful messaging', async () => {
      mockServer.mockSendServerError(1);
      client = new PostalClient(config, { enableRetry: false });

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow(/postal error: server error/i);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on server error and succeed', async () => {
      const messageId = generateMessageId();

      // First attempt: server error (will retry)
      mockServer.mockSendServerError(1);

      // Second attempt: success
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10, // Use short delay for tests
      });

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Test',
      });

      expect(result.message_id).toBe(messageId);
    });

    it('should retry multiple times before failing', async () => {
      // All attempts fail with server error
      mockServer.mockSendServerError(3);

      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
      });

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should retry on ECONNRESET and succeed', async () => {
      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
      });

      const retry = (client as any).retryWithBackoff.bind(client);
      let calls = 0;

      const result = await retry(async () => {
        calls += 1;
        if (calls === 1) {
          throw { code: 'ECONNRESET', message: 'Connection reset by peer' };
        }
        return { ok: true };
      }, 'Send message');

      expect(result).toEqual({ ok: true });
      expect(calls).toBe(2);
    });

    it('should retry ECONNREFUSED only once before failing', async () => {
      const onRetry = jest.fn();
      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
        onRetry,
      });

      const retry = (client as any).retryWithBackoff.bind(client);
      let calls = 0;

      await expect(
        retry(async () => {
          calls += 1;
          throw { code: 'ECONNREFUSED', message: 'Connection refused' };
        }, 'Send message')
      ).rejects.toThrow(/could not connect/i);

      expect(calls).toBe(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback with retry metadata', async () => {
      const messageId = generateMessageId();
      mockServer.mockSendServerError(1);
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const onRetry = jest.fn();
      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
        onRetry,
      });

      await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Test',
      });

      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'Send message',
          attempt: 1,
          maxRetries: 3,
          delayMs: expect.any(Number),
          statusCode: 500,
        })
      );
    });

    it('should NOT retry on authentication errors', async () => {
      mockServer.mockSendAuthError();

      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
      });

      const startTime = Date.now();

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // Should fail immediately without retry (< 100ms)
      expect(elapsed).toBeLessThan(100);
    });

    it('should NOT retry on validation errors', async () => {
      mockServer.mockSendValidationError('NoRecipients', 'No recipients');

      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
      });

      const startTime = Date.now();

      await expect(
        client.sendMessage({
          to: [],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // Should fail immediately without retry
      expect(elapsed).toBeLessThan(100);
    });

    it('should respect enableRetry: false option', async () => {
      mockServer.mockSendServerError(1);

      client = new PostalClient(config, {
        enableRetry: false,
      });

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should use exponential backoff for retries', async () => {
      const messageId = generateMessageId();

      // Fail twice, succeed on third
      mockServer.mockSendServerError(2);
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 50, // 50ms base delay
      });

      const startTime = Date.now();

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Test',
      });

      const elapsed = Date.now() - startTime;

      expect(result.message_id).toBe(messageId);

      // Should take at least 50ms (first retry) + 100ms (second retry) = 150ms
      // with some buffer for execution time
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Full Send → Read → Delete Flow', () => {
    beforeEach(() => {
      client = new PostalClient(config);
    });

    it('should complete full email lifecycle', async () => {
      const messageId = generateMessageId();

      // 1. Send email
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const sendResult = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Full Lifecycle Test',
        plain_body: 'Testing full lifecycle',
      });

      expect(sendResult.message_id).toBe(messageId);

      // 2. Read message details
      mockServer.mockGetMessage(messageId, {
        id: 1000,
        token: 'test-token',
        plain_body: 'Testing full lifecycle',
        details: {
          rcpt_to: 'recipient@example.com',
          mail_from: 'test@example.com',
          subject: 'Full Lifecycle Test',
          message_id: messageId,
          timestamp: Date.now() / 1000,
          direction: 'outgoing',
          size: 1024,
          bounce: false,
        },
      });

      const messageDetails = await client.getMessage(messageId);

      expect(messageDetails.plain_body).toBe('Testing full lifecycle');
      expect(messageDetails.details?.subject).toBe('Full Lifecycle Test');

      // 3. Check delivery status
      mockServer.mockGetDeliveries(messageId, [
        {
          id: 1,
          status: 'Sent',
          details: 'Message delivered successfully',
          time: Date.now() / 1000,
        },
      ]);

      const deliveries = await client.getDeliveries(messageId);

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe('Sent');
    });

    it('should handle send → read with multiple recipients', async () => {
      const messageId = generateMessageId();
      const recipients = ['user1@example.com', 'user2@example.com'];

      // Send
      mockServer.mockSendSuccess(recipients, messageId);

      const sendResult = await client.sendMessage({
        to: recipients,
        subject: 'Multi-recipient Test',
        plain_body: 'Test',
      });

      expect(Object.keys(sendResult.messages)).toHaveLength(2);

      // Read
      mockServer.mockGetMessage(messageId, {
        id: 1000,
        token: 'test-token',
      });

      const message = await client.getMessage(messageId);
      expect(message).toBeDefined();

      // Check deliveries
      mockServer.mockGetDeliveries(messageId, [
        { id: 1, status: 'Sent', time: Date.now() / 1000 },
        { id: 2, status: 'Sent', time: Date.now() / 1000 },
      ]);

      const deliveries = await client.getDeliveries(messageId);
      expect(deliveries).toHaveLength(2);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      client = new PostalClient(config, {
        enableRetry: true,
        maxRetries: 3,
        baseDelay: 10,
      });
    });

    it('should handle rate limiting and retry', async () => {
      const messageId = generateMessageId();

      // First attempt: rate limited
      mockServer.mockSendRateLimitError();

      // Second attempt: success
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Test',
      });

      expect(result.message_id).toBe(messageId);
    });
  });
});
