import prompts from 'prompts';
import { createConfigCommand } from '../config';

const mockExists = jest.fn();
const mockSave = jest.fn();
const mockGetPath = jest.fn(() => '/tmp/.mailgoat/config.json');
const mockGetMessage = jest.fn();

jest.mock('prompts', () => jest.fn());

jest.mock('../../lib/config', () => {
  const actual = jest.requireActual('../../lib/config');
  return {
    ...actual,
    ConfigManager: jest.fn().mockImplementation(() => ({
      exists: mockExists,
      save: mockSave,
      getPath: mockGetPath,
      load: jest.fn(),
    })),
  };
});

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    getMessage: mockGetMessage,
  })),
}));

describe('config init command', () => {
  const promptsMock = prompts as unknown as jest.Mock;
  const originalExit = process.exit;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPath.mockReturnValue('/tmp/.mailgoat/config.json');
    mockExists.mockResolvedValue(false);
    mockSave.mockResolvedValue(undefined);
    mockGetMessage.mockRejectedValue(new Error('Message not found'));
    console.log = jest.fn();
    process.exit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`PROCESS_EXIT:${code}`);
    }) as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.log = originalLog;
  });

  it('prompts for required fields and saves config', async () => {
    promptsMock.mockResolvedValueOnce({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      fromName: 'Agent One',
      confirm: true,
    });

    const command = createConfigCommand();
    await command.parseAsync(['init', '--skip-test'], { from: 'user' });

    const firstPromptArgs = promptsMock.mock.calls[0][0];
    expect(Array.isArray(firstPromptArgs)).toBe(true);
    expect(firstPromptArgs.map((q: { name: string }) => q.name)).toEqual([
      'server',
      'api_key',
      'fromAddress',
      'fromName',
      'confirm',
    ]);

    expect(mockSave).toHaveBeenCalledWith({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      fromName: 'Agent One',
    });
  });

  it('tests connection after setup by default', async () => {
    promptsMock.mockResolvedValueOnce({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      fromName: '',
      confirm: true,
    });

    const command = createConfigCommand();
    await command.parseAsync(['init'], { from: 'user' });

    expect(mockGetMessage).toHaveBeenCalledWith('test-message-id');
    expect(mockSave).toHaveBeenCalledWith({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
      fromName: undefined,
    });
  });

  it('prompts to overwrite existing config and cancels when declined', async () => {
    mockExists.mockResolvedValue(true);
    promptsMock.mockResolvedValueOnce({ value: false });

    const command = createConfigCommand();

    await command.parseAsync(['init'], { from: 'user' });

    expect(mockSave).not.toHaveBeenCalled();
  });
});
