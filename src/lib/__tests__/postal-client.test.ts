import axios from 'axios';
import { PostalClient } from '../postal-client';
import type { MailGoatConfig } from '../config';

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

  it('sends message including attachments', async () => {
    axiosInstance.post.mockResolvedValue({
      data: { data: { message_id: 'm1', messages: { 'a@b.com': { id: 1, token: 't' } } } },
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
});
