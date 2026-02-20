import { promises as fs } from 'fs';
import { TemplateManager } from '../template-manager';
import {
  getBashCompletionScript,
  getCompletionSuggestions,
  getFishCompletionScript,
  getPowerShellCompletionScript,
  getZshCompletionScript,
  installCompletion,
} from '../completion';

jest.mock('../template-manager', () => ({
  TemplateManager: jest.fn().mockImplementation(() => ({
    list: jest.fn().mockResolvedValue([{ name: 'welcome' }, { name: 'reset-password' }]),
  })),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.readFile.mockRejectedValue(new Error('missing'));
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
  });

  it('suggests top-level commands', async () => {
    const out = await getCompletionSuggestions(['se'], 0);
    expect(out).toContain('send');
  });

  it('suggests template names for --template', async () => {
    const out = await getCompletionSuggestions(['send', '--template', 're'], 2);
    expect(out).toContain('reset-password');
    expect(TemplateManager).toHaveBeenCalled();
  });

  it('suggests recent emails for --to from history file', async () => {
    mockedFs.readFile.mockResolvedValueOnce(
      JSON.stringify(['alice@example.com', 'support@app.com'])
    );
    const out = await getCompletionSuggestions(['send', '--to', 'a'], 2);
    expect(out).toEqual(['alice@example.com']);
  });

  it('suggests flags for current command', async () => {
    const out = await getCompletionSuggestions(['send', '--bo'], 1);
    expect(out).toContain('--body');
    expect(out).toContain('--body-html');
  });

  it('generates scripts for all shells', () => {
    expect(getBashCompletionScript()).toContain('complete -F _mailgoat_complete mailgoat');
    expect(getZshCompletionScript()).toContain('compdef _mailgoat_complete mailgoat');
    expect(getFishCompletionScript()).toContain('complete -c mailgoat');
    expect(getPowerShellCompletionScript()).toContain('Register-ArgumentCompleter');
  });

  it('installs bash completion by default', async () => {
    process.env.SHELL = '/bin/bash';
    const out = await installCompletion();
    expect(out.shell).toBe('bash');
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });

  it('installs explicit shell completion', async () => {
    const out = await installCompletion('fish');
    expect(out.shell).toBe('fish');
    expect(String(out.path)).toContain('fish/completions');
  });
});
