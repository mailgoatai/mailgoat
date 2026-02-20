import { createSendCommand } from '../send';

const mockLoad = jest.fn();
const mockSend = jest.fn();
const mockPostalClient = jest.fn();

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({ load: mockLoad })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation((...args: unknown[]) => {
    mockPostalClient(...args);
    return { sendMessage: mockSend };
  }),
}));

describe('send retry options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        timeoutMs: 30000,
      },
    });
    mockSend.mockResolvedValue({ message_id: 'msg-1', messages: {} });
  });

  it('passes CLI retry and timeout flags to PostalClient', async () => {
    const command = createSendCommand();

    await command.parseAsync(
      [
        '--to',
        'user@example.com',
        '--subject',
        'Test',
        '--body',
        'Body',
        '--retry-max',
        '5',
        '--retry-delay',
        '2000',
        '--retry-max-delay',
        '10000',
        '--retry-backoff',
        '3',
        '--timeout',
        '15000',
      ],
      { from: 'user' }
    );

    expect(mockPostalClient).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 3,
        timeout: 15000,
      })
    );
  });
});
