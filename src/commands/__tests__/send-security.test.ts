import { createSendCommand } from '../send';

const mockLoadConfig = jest.fn();
const mockSendMessage = jest.fn();
const mockReadFile = jest.fn();

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: jest.fn().mockRejectedValue(new Error('missing')),
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
  };
});

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    load: mockLoadConfig,
  })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
  })),
}));

describe('send command security', () => {
  const originalExit = process.exit;
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      security: {
        sanitization: {
          html: 'strict',
          headers: 'validate',
        },
      },
    });
    mockReadFile.mockResolvedValue('<div><script>alert(1)</script><p>safe</p></div>');
    mockSendMessage.mockResolvedValue({
      message_id: 'msg-123',
      messages: { 'to@example.com': { id: 1 } },
    });
    console.error = jest.fn();
    process.exit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`PROCESS_EXIT:${code}`);
    }) as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('sanitizes html body loaded from file', async () => {
    const command = createSendCommand();
    await command.parseAsync(
      ['send', '--to', 'to@example.com', '--subject', 'Hello', '--body-html', 'template.html'],
      { from: 'user' }
    );

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        html_body: '<div><p>safe</p></div>',
      })
    );
  });

  it('rejects CRLF header injection', async () => {
    const command = createSendCommand();
    await expect(
      command.parseAsync(
        [
          'send',
          '--to',
          'to@example.com',
          '--subject',
          'Hi\r\nBcc:attacker@example.com',
          '--body',
          'Test',
        ],
        { from: 'user' }
      )
    ).rejects.toThrow('PROCESS_EXIT:1');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('CRLF injection pattern detected')
    );
  });
});
