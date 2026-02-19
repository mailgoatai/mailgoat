import { createSendCommand } from '../send';

const mockLoad = jest.fn();
const mockSend = jest.fn();

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({ load: mockLoad })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({ sendMessage: mockSend })),
}));

describe('send dry-run', () => {
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
    });
  });

  afterAll(() => {
    console.log = originalLog;
  });

  it('validates and does not send when --dry-run is used', async () => {
    const command = createSendCommand();

    await command.parseAsync(
      [
        '--to',
        'user@example.com',
        '--subject',
        'Test',
        '--body',
        'Dry run body',
        '--dry-run',
        '--json',
      ],
      { from: 'user' }
    );

    expect(mockSend).not.toHaveBeenCalled();
  });
});
