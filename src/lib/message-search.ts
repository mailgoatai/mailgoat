import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface CachedMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body?: string;
  received_at: string;
  tag?: string;
  has_attachments?: boolean;
  attachments?: Array<{ name?: string; filename?: string }>;
}

export interface MessageSearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  after?: number;
  before?: number;
  tag?: string;
  hasAttachment?: boolean;
}

export type SearchSortField = 'date' | 'from' | 'to' | 'subject';
export type SearchOrder = 'asc' | 'desc';

export function getDefaultInboxCachePath(): string {
  return path.join(os.homedir(), '.mailgoat', 'inbox', 'messages.json');
}

export async function loadCachedMessages(cachePath: string): Promise<CachedMessage[]> {
  const content = await fs.readFile(cachePath, 'utf8');
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid cache format in ${cachePath}: expected an array of messages`);
  }

  return parsed as CachedMessage[];
}

export function parseSearchDate(dateStr: string): number {
  const isoDate = new Date(dateStr);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.getTime();
  }

  const match = dateStr.match(/^(\d+)([hdwmy])$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Use ISO date (2024-01-01) or relative (7d, 2w)`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return Date.now() - value * multipliers[unit];
}

export function searchCachedMessages(
  messages: CachedMessage[],
  filters: MessageSearchFilters
): CachedMessage[] {
  return messages.filter((message) => {
    const timestamp = Date.parse(message.received_at);

    if (filters.from && !message.from.toLowerCase().includes(filters.from.toLowerCase())) {
      return false;
    }

    if (
      filters.to &&
      !message.to.some((recipient) => recipient.toLowerCase().includes(filters.to!.toLowerCase()))
    ) {
      return false;
    }

    if (
      filters.subject &&
      !message.subject.toLowerCase().includes(filters.subject.toLowerCase())
    ) {
      return false;
    }

    if (filters.body && !(message.body || '').toLowerCase().includes(filters.body.toLowerCase())) {
      return false;
    }

    if (filters.tag && (message.tag || '').toLowerCase() !== filters.tag.toLowerCase()) {
      return false;
    }

    if (filters.after && (!Number.isFinite(timestamp) || timestamp < filters.after)) {
      return false;
    }

    if (filters.before && (!Number.isFinite(timestamp) || timestamp > filters.before)) {
      return false;
    }

    if (filters.hasAttachment) {
      const hasAttachments =
        message.has_attachments === true || (Array.isArray(message.attachments) && message.attachments.length > 0);
      if (!hasAttachments) {
        return false;
      }
    }

    return true;
  });
}

export function sortCachedMessages(
  messages: CachedMessage[],
  sort: SearchSortField,
  order: SearchOrder
): CachedMessage[] {
  const sorted = [...messages].sort((a, b) => {
    let left = '';
    let right = '';

    switch (sort) {
      case 'date':
        return Date.parse(a.received_at) - Date.parse(b.received_at);
      case 'from':
        left = a.from;
        right = b.from;
        break;
      case 'to':
        left = a.to[0] || '';
        right = b.to[0] || '';
        break;
      case 'subject':
        left = a.subject;
        right = b.subject;
        break;
      default:
        return 0;
    }

    return left.localeCompare(right, undefined, { sensitivity: 'base' });
  });

  return order === 'desc' ? sorted.reverse() : sorted;
}
