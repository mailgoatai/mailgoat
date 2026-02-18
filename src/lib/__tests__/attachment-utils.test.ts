import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ATTACHMENT_MAX_SIZE,
  ATTACHMENT_WARN_SIZE,
  detectMimeType,
  prepareAttachment,
  validateAttachmentSize,
} from '../attachment-utils';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-attach-'));
}

describe('attachment-utils', () => {
  it('detects MIME type for known content', async () => {
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx8YAAAAASUVORK5CYII=',
      'base64'
    );
    const mime = await detectMimeType('image.bin', onePixelPng);
    expect(mime).toBe('image/png');
  });

  it('prepares attachment with base64 data', async () => {
    const dir = tmpDir();
    const filePath = path.join(dir, 'report.txt');
    fs.writeFileSync(filePath, 'hello world');

    const result = await prepareAttachment(filePath);

    expect(result.name).toBe('report.txt');
    expect(result.content_type).toBe('text/plain');
    expect(Buffer.from(result.data, 'base64').toString('utf8')).toBe('hello world');
    expect(result.size).toBe(11);
  });

  it('warns for files larger than 10MB and fails above 25MB', () => {
    const warn = validateAttachmentSize(ATTACHMENT_WARN_SIZE + 1, 'big.log');
    expect(warn.warning).toContain('exceeds 10MB');

    expect(() => validateAttachmentSize(ATTACHMENT_MAX_SIZE + 1, 'huge.bin')).toThrow(
      /Maximum is 25MB/
    );
  });
});
