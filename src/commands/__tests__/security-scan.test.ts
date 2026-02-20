import { createSecurityScanCommand } from '../security-scan';

const mockReadFile = jest.fn();

jest.mock('fs', () => ({
  promises: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
  },
}));

describe('security-scan command', () => {
  const originalExit = process.exit;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`PROCESS_EXIT:${code}`);
    }) as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.log = originalLog;
  });

  it('exits with code 1 when vulnerabilities are detected', async () => {
    mockReadFile.mockResolvedValue('<script>alert(1)</script>');
    const command = createSecurityScanCommand();

    await expect(
      command.parseAsync(['security-scan', 'template.html'], { from: 'user' })
    ).rejects.toThrow('PROCESS_EXIT:1');
  });

  it('prints clean result when no vulnerabilities are found', async () => {
    mockReadFile.mockResolvedValue('<p>Hello</p>');
    const command = createSecurityScanCommand();

    await command.parseAsync(['security-scan', 'template.html'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No security issues found'));
  });
});
