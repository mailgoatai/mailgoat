import { TemplateManager } from '../template-manager';
import { promises as fsPromises } from 'fs';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
  },
}));

const mockedFs = fsPromises as jest.Mocked<typeof fsPromises>;

describe('TemplateManager', () => {
  const templatesDir = '/tmp/templates';
  let manager: TemplateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new TemplateManager(templatesDir);
  });

  it('creates template and ensures directory', async () => {
    mockedFs.access
      .mockRejectedValueOnce(new Error('missing dir'))
      .mockRejectedValueOnce(new Error('missing file'));
    mockedFs.mkdir.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined as any);

    await manager.create({ name: 'welcome', subject: 'Hi {{name}}', body: 'Body' });

    expect(mockedFs.mkdir).toHaveBeenCalled();
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });

  it('loads and renders template', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(
      'name: welcome\nsubject: "Hi {{name}}"\nbody: "Hello {{name}}"\n' as any
    );

    const template = await manager.load('welcome');
    const rendered = manager.render(template, { name: 'Alice' });

    expect(rendered.subject).toBe('Hi Alice');
    expect(rendered.body).toBe('Hello Alice');
  });

  it('lists templates and ignores invalid entries', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue(['b.yml', 'a.yml', 'x.txt'] as any);
    mockedFs.readFile.mockImplementation(async (p: any) => {
      if (String(p).endsWith('a.yml')) return 'name: a\nsubject: s\nbody: b\n' as any;
      if (String(p).endsWith('b.yml')) return 'name: b\nsubject: s\nbody: b\n' as any;
      return '' as any;
    });

    const list = await manager.list();
    expect(list.map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('deletes existing template', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.unlink.mockResolvedValue(undefined as any);
    await manager.delete('welcome');
    expect(mockedFs.unlink).toHaveBeenCalled();
  });

  it('exists returns false for invalid name and missing file', async () => {
    expect(await manager.exists('invalid name')).toBe(false);
    mockedFs.access.mockRejectedValueOnce(new Error('missing'));
    expect(await manager.exists('missing')).toBe(false);
  });
});
