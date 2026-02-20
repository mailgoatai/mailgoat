import { createCompletionCommand, createInternalCompleteCommand } from '../completion';

describe('completion command', () => {
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    (process.stdout.write as jest.Mock).mockRestore();
  });

  afterAll(() => {
    process.stdout.write = originalWrite;
  });

  it('prints bash script', async () => {
    const command = createCompletionCommand();
    await command.parseAsync(['bash'], { from: 'user' });
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('mailgoat bash completion')
    );
  });

  it('returns internal completions', async () => {
    process.env.COMP_CWORD = '0';
    const command = createInternalCompleteCommand();
    await command.parseAsync(['bash', 'se'], { from: 'user' });
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('send'));
  });
});
