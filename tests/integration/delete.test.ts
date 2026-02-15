/**
 * Integration tests for message deletion
 * Tests delete functionality with mock Postal server
 */

import { PostalClient } from '../../src/lib/postal-client';
import { MailGoatConfig } from '../../src/lib/config';
import { createMockPostalServer, generateMessageId, MockPostalServer } from './helpers/mock-postal';

describe('Delete Command Integration Tests', () => {
  let mockServer: MockPostalServer;
  let client: PostalClient;
  let config: MailGoatConfig;

  beforeEach(() => {
    config = {
      server: 'https://postal.example.com',
      email: 'test@example.com',
      api_key: 'test-api-key',
    };

    mockServer = createMockPostalServer({
      serverUrl: config.server,
      apiKey: config.api_key,
    });

    client = new PostalClient(config);
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  describe('deleteMessage', () => {
    it('should delete a message successfully', async () => {
      const messageId = generateMessageId();

      // Mock successful delete
      mockServer.mockDeleteSuccess(messageId);

      const result = await client.deleteMessage(messageId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle message not found', async () => {
      const messageId = generateMessageId();

      mockServer.mockDeleteNotFound(messageId);

      await expect(client.deleteMessage(messageId)).rejects.toThrow(/not found/i);
    });

    it('should handle permission denied', async () => {
      const messageId = generateMessageId();

      mockServer.mockDeleteAuthError();

      await expect(client.deleteMessage(messageId)).rejects.toThrow(/authentication/i);
    });

    it('should retry on server error', async () => {
      const messageId = generateMessageId();

      // First attempt fails, second succeeds
      mockServer.mockDeleteServerError();
      mockServer.mockDeleteSuccess(messageId);

      const result = await client.deleteMessage(messageId);

      expect(result.success).toBe(true);
    });

    it('should handle network timeout', async () => {
      const messageId = generateMessageId();

      mockServer.mockDeleteTimeout();

      await expect(client.deleteMessage(messageId)).rejects.toThrow(/timeout/i);
    });
  });

  describe('Delete Workflow', () => {
    it('should complete send → read → delete flow', async () => {
      const messageId = generateMessageId();

      // 1. Send message
      mockServer.mockSendSuccess(['recipient@example.com'], messageId);

      const sendResult = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Test body',
      });

      expect(sendResult.message_id).toBe(messageId);

      // 2. Read message
      mockServer.mockGetMessage(messageId, {
        id: 1000,
        token: 'test-token',
        plain_body: 'Test body',
      });

      const message = await client.getMessage(messageId);

      expect(message.plain_body).toBe('Test body');

      // 3. Delete message
      mockServer.mockDeleteSuccess(messageId);

      const deleteResult = await client.deleteMessage(messageId);

      expect(deleteResult.success).toBe(true);

      // 4. Verify deletion (should fail)
      mockServer.mockDeleteNotFound(messageId);

      await expect(client.deleteMessage(messageId)).rejects.toThrow(/not found/i);
    });

    it('should handle delete of already deleted message', async () => {
      const messageId = generateMessageId();

      // Try to delete non-existent message
      mockServer.mockDeleteNotFound(messageId);

      await expect(client.deleteMessage(messageId)).rejects.toThrow(/not found/i);
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error for invalid message ID format', async () => {
      const invalidId = 'not-a-valid-id';

      mockServer.mockDeleteValidationError('InvalidMessageId', 'Invalid message ID format');

      await expect(client.deleteMessage(invalidId)).rejects.toThrow(/invalid.*id/i);
    });

    it('should handle rate limiting', async () => {
      const messageId = generateMessageId();

      // Rate limited, then success
      mockServer.mockDeleteRateLimitError();
      mockServer.mockDeleteSuccess(messageId);

      const result = await client.deleteMessage(messageId);

      expect(result.success).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry transient failures', async () => {
      const messageId = generateMessageId();

      // Fail twice, succeed third time
      mockServer.mockDeleteServerError();
      mockServer.mockDeleteServerError();
      mockServer.mockDeleteSuccess(messageId);

      const result = await client.deleteMessage(messageId);

      expect(result.success).toBe(true);
    });

    it('should NOT retry on client errors', async () => {
      const messageId = generateMessageId();

      mockServer.mockDeleteValidationError('InvalidRequest', 'Bad request');

      const startTime = Date.now();

      await expect(client.deleteMessage(messageId)).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // Should fail immediately without retry
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Multiple Deletions', () => {
    it('should delete multiple messages sequentially', async () => {
      const messageIds = [generateMessageId(), generateMessageId(), generateMessageId()];

      // Mock deletions
      messageIds.forEach((id) => {
        mockServer.mockDeleteSuccess(id);
      });

      const results = [];

      for (const id of messageIds) {
        const result = await client.deleteMessage(id);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle partial failures in batch', async () => {
      const messageIds = [generateMessageId(), generateMessageId(), generateMessageId()];

      // First succeeds, second fails, third succeeds
      mockServer.mockDeleteSuccess(messageIds[0]);
      mockServer.mockDeleteNotFound(messageIds[1]);
      mockServer.mockDeleteSuccess(messageIds[2]);

      const results = [];
      const errors = [];

      for (const id of messageIds) {
        try {
          const result = await client.deleteMessage(id);
          results.push(result);
        } catch (error) {
          errors.push(error);
        }
      }

      expect(results).toHaveLength(2); // Two successes
      expect(errors).toHaveLength(1); // One failure
    });
  });
});
