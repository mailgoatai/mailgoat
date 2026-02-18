import { createSendCommand } from '../send';

const mockLoad = jest.fn();
const mockEnqueue = jest.fn();
const mockClose = jest.fn();
const mockSendMessage = jest.fn();

jest.mock('../../lib/config', () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    load: mockLoad,
  })),
}));

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
  })),
}));

jest.mock('../../lib/scheduler', () => {
  const actual = jest.requireActual('../../lib/scheduler');
  return {
    ...actual,
    SchedulerStore: jest.fn().mockImplementation(() => ({
      enqueue: mockEnqueue,
      close: mockClose,
    })),
  };
});

describe('send --schedule', () => {
  const originalLog = console.log;
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn() as never;

    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_abc123def456',
      fromAddress: 'agent@example.com',
    });

    mockEnqueue.mockReturnValue({
      id: 123,
      scheduledForIso: '2026-03-01T14:00:00.000Z',
      timezone: 'America/New_York',
    });
  });

  afterAll(() => {
    console.log = originalLog;
    process.exit = originalExit;
  });

  it('queues scheduled email instead of sending immediately', async () => {
    const command = createSendCommand();

    await command.parseAsync(
      [
        '--to',
        'user@example.com',
        '--subject',
        'Scheduled',
        '--body',
        'Later',
        '--schedule',
        '2026-03-01 09:00',
      ],
      { from: 'user' }
    );

    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue.mock.calls[0][0].payload).toMatchObject({
      to: ['user@example.com'],
      subject: 'Scheduled',
      plain_body: 'Later',
    });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
