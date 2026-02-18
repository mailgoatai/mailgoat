import { createConfigCommand } from '../config';

const mockLoad = jest.fn();
const mockGetMessage = jest.fn();

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({ load: mockLoad })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({ getMessage: mockGetMessage })),
}));

describe('config validate command', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn() as never;
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
    });
    mockGetMessage.mockRejectedValue(new Error('Authentication failed. test only'));
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  it('returns success code when validation checks pass', async () => {
    const command = createConfigCommand();

    await command.parseAsync(['validate', '--json'], { from: 'user' });

    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
