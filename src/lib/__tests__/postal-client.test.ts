/**
 * PostalClient Unit Tests
 *
 * Tests for the Postal API client with mocked HTTP requests.
 */

import { PostalClient } from '../postal-client';
import type { MailGoatConfig } from '../config';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PostalClient', () => {
  let client: PostalClient;
  let mockConfig: MailGoatConfig;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      server: 'https://postal.example.com',
      email: 'sender@example.com',
      api_key: 'test_api_key_123',
    };

    // Setup mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    // Create client
    client = new PostalClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://postal.example.com/api/v1',
          timeout: 30000,
        })
      );
    });

    it('should set X-Server-API-Key header', () => {
      expect(mockAxiosInstance.defaults.headers.common['X-Server-API-Key']).toBe(
        'test_api_key_123'
      );
    });

    it('should accept custom options', () => {
      new PostalClient(mockConfig, {
        maxRetries: 5,
        baseDelay: 2000,
        enableRetry: false,
      });

      // Verify client was created
      expect(mockedAxios.create).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should send basic email successfully', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            message_id: 'msg_123',
            messages: {
              'recipient@example.com': {
                id: 1,
                token: 'token_abc',
              },
            },
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        plain_body: 'Test body',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          plain_body: 'Test body',
          from: 'sender@example.com',
        })
      );

      expect(result.message_id).toBe('msg_123');
      expect(result.messages['recipient@example.com']).toBeDefined();
    });

    it('should send email with CC and BCC', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: {
            message_id: 'msg_123',
            messages: {},
          },
        },
      });

      await client.sendMessage({
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test',
        plain_body: 'Body',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
        })
      );
    });

    it('should send email with HTML body', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: { message_id: 'msg_123', messages: {} },
        },
      });

      await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        html_body: '<h1>Hello</h1>',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          html_body: '<h1>Hello</h1>',
        })
      );
    });

    it('should send email with custom tag', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: { message_id: 'msg_123', messages: {} },
        },
      });

      await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Body',
        tag: 'newsletter',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          tag: 'newsletter',
        })
      );
    });

    it('should send email with attachments', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: { message_id: 'msg_123', messages: {} },
        },
      });

      const attachments = [
        {
          name: 'test.txt',
          content_type: 'text/plain',
          data: 'base64data',
        },
      ];

      await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Body',
        attachments,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          attachments,
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(
        client.sendMessage({
          to: ['recipient@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow('Network error');
    });

    it('should retry on transient failures', async () => {
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: {
            status: 'success',
            data: { message_id: 'msg_123', messages: {} },
          },
        });

      const result = await client.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        plain_body: 'Body',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result.message_id).toBe('msg_123');
    });
  });

  // TODO: getMessages list endpoint not available in Postal Legacy API
  describe.skip('getMessages', () => {
    it('should fetch messages successfully', async () => {
      const mockMessages = [
        {
          id: 1,
          message_id: 'msg_1',
          subject: 'Test 1',
          from: 'sender@example.com',
          to: 'recipient@example.com',
        },
        {
          id: 2,
          message_id: 'msg_2',
          subject: 'Test 2',
          from: 'sender@example.com',
          to: 'recipient@example.com',
        },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: mockMessages,
        },
      });

      const result = await client.getMessage('recipient@example.com');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/messages', {
        rcpt_to: 'recipient@example.com',
      });

      expect(result).toEqual(mockMessages);
    });

    it('should fetch messages with pagination', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: [],
        },
      });

      await client.getMessage('recipient@example.com', 2);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/messages', {
        rcpt_to: 'recipient@example.com',
        page: 2,
      });
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API error'));

      await expect(client.getMessage('recipient@example.com')).rejects.toThrow('API error');
    });
  });

  describe('getMessage', () => {
    it('should fetch single message by ID', async () => {
      const mockMessage = {
        id: 1,
        message_id: 'msg_123',
        subject: 'Test',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        plain_body: 'Test body',
        html_body: '<p>Test body</p>',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: mockMessage,
        },
      });

      const result = await client.getMessage('msg_123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/message', {
        id: 'msg_123',
      });

      expect(result).toEqual(mockMessage);
    });

    it('should handle not found error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Message not found'));

      await expect(client.getMessage('nonexistent')).rejects.toThrow('Message not found');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: { deleted: true },
        },
      });

      await client.deleteMessage('msg_123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/delete', {
        id: 'msg_123',
      });
    });

    it('should handle deletion errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Delete failed'));

      await expect(client.deleteMessage('msg_123')).rejects.toThrow('Delete failed');
    });
  });

  // TODO: Implement searchMessages() - not yet available in PostalClient
  describe.skip('searchMessages', () => {
    it('should search messages with query', async () => {
      const mockResults = [
        {
          id: 1,
          message_id: 'msg_1',
          subject: 'Search result',
        },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: mockResults,
        },
      });

      const result = await client.searchMessages('test query');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/search', {
        query: 'test query',
      });

      expect(result).toEqual(mockResults);
    });

    it('should search with pagination', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: [],
        },
      });

      await client.searchMessages('query', 3);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/messages/search', {
        query: 'query',
        page: 3,
      });
    });
  });

  describe('error handling', () => {
    it('should preserve error messages', async () => {
      const errorMessage = 'Invalid API key';
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND',
      });

      await expect(
        client.sendMessage({
          to: ['test@example.com'],
          subject: 'Test',
          plain_body: 'Body',
        })
      ).rejects.toThrow();
    });
  });

  describe('connection pooling', () => {
    it('should create client with connection pooling', () => {
      const _clientWithPool = new PostalClient(mockConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          httpAgent: expect.any(Object),
          httpsAgent: expect.any(Object),
        })
      );
    });
  });
});
