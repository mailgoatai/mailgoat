/**
 * Tests for Postal Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostalClient } from './postal-client.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('PostalClient', () => {
  let client: PostalClient;

  beforeEach(() => {
    client = new PostalClient({
      serverUrl: 'https://postal.test.example.com',
      apiKey: 'test_api_key',
      fromEmail: 'test@example.com',
    });

    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          time: 0.5,
          flags: {},
          data: {
            message_id: 'msg_12345',
            messages: {
              'test@example.com': {
                id: 1,
                token: 'token_12345',
              },
            },
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any);

      // Recreate client after mocking
      client = new PostalClient({
        serverUrl: 'https://postal.test.example.com',
        apiKey: 'test_api_key',
        fromEmail: 'test@example.com',
      });

      const result = await client.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plainBody: 'Test body',
      });

      expect(result.data.message_id).toBe('msg_12345');
    });

    it('should handle array of recipients', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          time: 0.5,
          flags: {},
          data: {
            message_id: 'msg_12345',
            messages: {},
          },
        },
      };

      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      mockedAxios.create.mockReturnValue({
        post: mockPost,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any);

      client = new PostalClient({
        serverUrl: 'https://postal.test.example.com',
        apiKey: 'test_api_key',
        fromEmail: 'test@example.com',
      });

      await client.sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        plainBody: 'Test',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        })
      );
    });
  });

  describe('sendSimpleEmail', () => {
    it('should send simple text email', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          time: 0.5,
          flags: {},
          data: {
            message_id: 'msg_12345',
            messages: {},
          },
        },
      };

      mockedAxios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any);

      client = new PostalClient({
        serverUrl: 'https://postal.test.example.com',
        apiKey: 'test_api_key',
        fromEmail: 'test@example.com',
      });

      const messageId = await client.sendSimpleEmail(
        'test@example.com',
        'Subject',
        'Body'
      );

      expect(messageId).toBe('msg_12345');
    });
  });

  describe('sendHtmlEmail', () => {
    it('should send HTML email with plain text fallback', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          time: 0.5,
          flags: {},
          data: {
            message_id: 'msg_12345',
            messages: {},
          },
        },
      };

      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      mockedAxios.create.mockReturnValue({
        post: mockPost,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any);

      client = new PostalClient({
        serverUrl: 'https://postal.test.example.com',
        apiKey: 'test_api_key',
        fromEmail: 'test@example.com',
      });

      await client.sendHtmlEmail(
        'test@example.com',
        'Subject',
        '<p>HTML body</p>'
      );

      expect(mockPost).toHaveBeenCalledWith(
        '/send/message',
        expect.objectContaining({
          html_body: '<p>HTML body</p>',
          plain_body: expect.any(String),
        })
      );
    });
  });
});
