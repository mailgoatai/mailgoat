import { createInspectCommand } from '../inspect';

const mockLoad = jest.fn();
const mockGetMessage = jest.fn();
const mockGetDeliveries = jest.fn();

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    load: mockLoad,
  })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    getMessage: mockGetMessage,
    getDeliveries: mockGetDeliveries,
  })),
}));

describe('inspect command', () => {
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
    });
    mockGetMessage.mockResolvedValue({ details: { rcpt_to: 'user@example.com' }, headers: {} });
    mockGetDeliveries.mockResolvedValue([{ status: 'delivered' }]);
  });

  afterAll(() => {
    console.log = originalLog;
  });

  it('outputs json inspection report', async () => {
    const command = createInspectCommand();

    await command.parseAsync(['abc123', '--json'], { from: 'user' });

    expect(mockGetMessage).toHaveBeenCalledWith('abc123', expect.any(Array));
    expect(mockGetDeliveries).toHaveBeenCalledWith('abc123');
  });
});
