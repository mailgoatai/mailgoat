import { createSendCommand } from '../send';

const mockLoadConfig = jest.fn();
const mockSendMessage = jest.fn();
const mockAccess = jest.fn();
const mockReadFile = jest.fn();

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: (...args: unknown[]) => mockAccess(...args),
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

describe('send command templating', () => {
  const originalExit = process.exit;
  const originalError = console.error;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
    });
    mockSendMessage.mockResolvedValue({
      message_id: 'msg-123',
      messages: { 'to@example.com': { id: 1 } },
    });
    mockAccess.mockRejectedValue(new Error('missing'));
    mockReadFile.mockResolvedValue('{}');
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`PROCESS_EXIT:${code}`);
    }) as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.error = originalError;
    console.log = originalLog;
  });

  it('renders inline subject/body templates with --data JSON', async () => {
    mockReadFile.mockResolvedValueOnce('{"name":"Alice","city":"LONDON"}');

    const command = createSendCommand();
    await command.parseAsync(
      [
        'send',
        '--to',
        'to@example.com',
        '--subject',
        'Hello {{uppercase name}}',
        '--body',
        'City {{lowercase city}}',
        '--data',
        'data.json',
      ],
      { from: 'user' }
    );

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Hello ALICE',
        plain_body: 'City london',
      })
    );
  });

  it('renders template file body via --template and --data', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile
      .mockResolvedValueOnce('{"name":"Alice"}')
      .mockResolvedValueOnce('Body for {{name}}');

    const command = createSendCommand();
    await command.parseAsync(
      [
        'send',
        '--to',
        'to@example.com',
        '--subject',
        'Report for {{name}}',
        '--template',
        'template.txt',
        '--data',
        'data.json',
      ],
      { from: 'user' }
    );

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Report for Alice',
        plain_body: 'Body for Alice',
      })
    );
  });

  it('fails with clear error for missing template variables', async () => {
    mockReadFile.mockResolvedValueOnce('{"name":"Alice"}');

    const command = createSendCommand();
    await expect(
      command.parseAsync(
        [
          'send',
          '--to',
          'to@example.com',
          '--subject',
          'Hello {{missing}}',
          '--body',
          'Test',
          '--data',
          'data.json',
        ],
        { from: 'user' }
      )
    ).rejects.toThrow('PROCESS_EXIT:1');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Template rendering failed'));
  });
});
