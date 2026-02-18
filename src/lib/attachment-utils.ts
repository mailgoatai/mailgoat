import * as fs from 'fs/promises';
import * as path from 'path';
import mime from 'mime-types';
import FileType from 'file-type';

export const ATTACHMENT_WARN_SIZE = 10 * 1024 * 1024; // 10MB
export const ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024; // 25MB

export interface PreparedAttachment {
  name: string;
  content_type: string;
  data: string;
  size: number;
}

export interface AttachmentValidation {
  warning?: string;
}

export async function detectMimeType(filePath: string, buffer: Buffer): Promise<string> {
  try {
    const match = await FileType.fromBuffer(buffer);
    if (match?.mime) {
      return match.mime;
    }
  } catch {
    // Fall back to extension-based detection.
  }

  return String(mime.lookup(filePath) || 'application/octet-stream');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function validateAttachmentSize(size: number, filePath: string): AttachmentValidation {
  if (size > ATTACHMENT_MAX_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    throw new Error(`Attachment too large: ${filePath} (${sizeMB}MB). Maximum is 25MB per file.`);
  }

  if (size > ATTACHMENT_WARN_SIZE) {
    return {
      warning: `Large attachment ${path.basename(filePath)} (${formatBytes(size)}) exceeds 10MB`,
    };
  }

  return {};
}

export async function prepareAttachment(filePath: string): Promise<PreparedAttachment> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Attachment file not found: ${filePath}`);
  }

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  validateAttachmentSize(stats.size, filePath);

  const content = await fs.readFile(filePath);
  const contentType = await detectMimeType(filePath, content);

  return {
    name: path.basename(filePath),
    content_type: contentType,
    data: content.toString('base64'),
    size: stats.size,
  };
}
