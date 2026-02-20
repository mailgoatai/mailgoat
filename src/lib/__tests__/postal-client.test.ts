import axios from 'axios';
import { PostalClient } from '../postal-client';
import type { MailGoatConfig } from '../config';
import { MailGoatError } from '../errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PostalClient', () => {
  let client: PostalClient;
  let axiosInstance: any;
  const config: MailGoatConfig = {
    server: 'postal.example.com',
    fromAddress: 'sender@example.com',
    email: 'sender@example.com',
    api_key: 'test_api_key_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axiosInstance = {
      post: jest.fn(),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    };
    mockedAxios.create.mockReturnValue(axiosInstance);
    client = new PostalClient(config);
  });

  it('creates axios instance with expected base config', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://postal.example.com',
        timeout: 30000,
        headers: expect.objectContaining({ 'X-Server-API-Key': 'test_api_key_123' }),
      })
    );
  });

  it('uses configured timeout when provided', () => {
    new PostalClient(config, { timeout: 10000 });
    expect(mockedAxios.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timeout: 10000,
      })
    );
  });

  it('sends message including attachments', async () => {
    axiosInstance.post.mockResolvedValue({
      data: { data: { message_id: 'm1', messages: { 'a@b.com': { id: 1, token: 't' } } } },
      headers: {
        'x-ratelimit-limit': '500',
        'x-ratelimit-remaining': '487',
        'x-ratelimit-reset': '900',
      },
    });

    const result = await client.sendMessage({
      to: ['a@b.com'],
      subject: 's',
      plain_body: 'b',
      attachments: [{ name: 'a.txt', content_type: 'text/plain', data: 'ZA==' }],
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/send/message',
      expect.objectContaining({ attachments: expect.any(Array) })
    );
    expect(result.message_id).toBe('m1');
    expect(result.rate_limit?.buckets.default?.remaining).toBe(487);
    expect(client.getLastRateLimit()?.buckets.default?.limit).toBe(500);
  });

  it('injects idempotency key header for send requests', async () => {
    axiosInstance.post.mockResolvedValue({
      data: { data: { message_id: 'm1', messages: { 'a@b.com': { id: 1, token: 't' } } } },
      headers: {},
    });

    await client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' });

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/send/message',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': expect.any(String),
        }),
      })
    );
  });

  it('gets message with default expansions', async () => {
    axiosInstance.post.mockResolvedValue({ data: { data: { id: 1, token: 't' } } });
    await client.getMessage('msg-1');

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/messages/message',
      expect.objectContaining({ id: 'msg-1', _expansions: ['status', 'details', 'plain_body'] })
    );
  });

  it('deletes message by id', async () => {
    axiosInstance.post.mockResolvedValue({ data: { data: { success: true } } });
    await client.deleteMessage('msg-1');
    expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/messages/delete', { id: 'msg-1' });
  });

  it('wraps network errors in categorized message', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network error'));
    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toThrow(/No response from Postal server/);
  });

  it('classifies auth errors with API exit code and request id', async () => {
    axiosInstance.post.mockRejectedValue({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: { 'x-request-id': 'req-123' },
      },
    });

    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toMatchObject({
      name: 'MailGoatError',
      type: 'AuthError',
      exitCode: 4,
      requestId: 'req-123',
    } satisfies Partial<MailGoatError>);
  });

  it('respects Retry-After header for rate limit backoff', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as any);

    axiosInstance.post
      .mockRejectedValueOnce({
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: { 'retry-after': '2' },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { message_id: 'm2', messages: { 'a@b.com': { id: 1, token: 't' } } } },
      });

    await client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' });
    expect(axiosInstance.post).toHaveBeenCalledTimes(2);
    const delayUsed = (timeoutSpy.mock.calls[0] || [])[1] as number;
    expect(delayUsed).toBeGreaterThanOrEqual(2000);
    expect(delayUsed).toBeLessThanOrEqual(2400);
    timeoutSpy.mockRestore();
  });

  it('applies exponential backoff with max delay', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as any);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    client = new PostalClient(config, {
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 1500,
      backoffMultiplier: 2,
    });

    axiosInstance.post
      .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'reset' })
      .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'reset' })
      .mockResolvedValueOnce({
        data: { data: { message_id: 'm2', messages: { 'a@b.com': { id: 1, token: 't' } } } },
        headers: {},
      });

    await client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' });
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 1500);

    timeoutSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('opens circuit breaker after repeated failures', async () => {
    client = new PostalClient(config, {
      enableRetry: false,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownMs: 10000,
    });
    axiosInstance.post.mockRejectedValue({ code: 'ECONNRESET', message: 'reset' });

    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toThrow();
    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toThrow();
    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toThrow(/Circuit breaker is open/);
  });

  it('captures rate limit headers from error responses', async () => {
    axiosInstance.post.mockRejectedValue({
      response: {
        status: 429,
        statusText: 'Too Many Requests',
        data: {},
        headers: {
          'x-ratelimit-limit-hour': '50',
          'x-ratelimit-remaining-hour': '5',
          'x-ratelimit-reset-hour': '900',
        },
      },
    });

    await expect(
      client.sendMessage({ to: ['a@b.com'], subject: 's', plain_body: 'b' })
    ).rejects.toThrow(/Rate limit exceeded/);

    expect(client.getLastRateLimit()?.buckets.hour?.limit).toBe(50);
    expect(client.getLastRateLimit()?.buckets.hour?.remaining).toBe(5);
  });
});
