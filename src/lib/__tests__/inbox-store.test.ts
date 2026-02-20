import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InboxStore, parseSinceToTimestamp } from '../inbox-store';

function createTempDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-inbox-'));
  return path.join(dir, `${name}.db`);
}

describe('InboxStore', () => {
  it('stores and lists messages with unread filter', () => {
    const dbPath = createTempDbPath('list');
    const store = new InboxStore(dbPath);

    store.upsertMessage({
      id: 'msg-1',
      from: 'alice@example.com',
      to: ['agent@example.com'],
      subject: 'Status update',
      timestamp: '2026-02-18T20:00:00.000Z',
      snippet: 'body',
    });

    const all = store.listMessages();
    expect(all).toHaveLength(1);
    expect(all[0].read).toBe(false);

    const unread = store.listMessages({ unread: true });
    expect(unread).toHaveLength(1);

    store.markAsRead('msg-1');
    const unreadAfterRead = store.listMessages({ unread: true });
    expect(unreadAfterRead).toHaveLength(0);

    store.markAsUnread('msg-1');
    const unreadAfterUnread = store.listMessages({ unread: true });
    expect(unreadAfterUnread).toHaveLength(1);

    store.close();
  });

  it('filters by since and supports search queries', () => {
    const dbPath = createTempDbPath('search');
    const store = new InboxStore(dbPath);

    store.upsertMessage({
      id: 'old-msg',
      from: 'noreply@example.com',
      to: ['agent@example.com'],
      subject: 'Yesterday news',
      timestamp: '2026-02-17T10:00:00.000Z',
      snippet: 'Old body',
    });

    store.upsertMessage({
      id: 'new-msg',
      from: 'ops@example.com',
      to: ['agent@example.com'],
      subject: 'Daily report',
      timestamp: '2026-02-18T10:00:00.000Z',
      snippet: 'Important details',
    });

    const filtered = store.listMessages({ since: Date.parse('2026-02-18T00:00:00.000Z') });
    expect(filtered.map((item) => item.id)).toEqual(['new-msg']);

    const subjectSearch = store.searchMessages('subject:report');
    expect(subjectSearch.map((item) => item.id)).toEqual(['new-msg']);

    const freeTextSearch = store.searchMessages('important');
    expect(freeTextSearch.map((item) => item.id)).toEqual(['new-msg']);

    store.close();
  });

  it('supports advanced search filters and pagination', () => {
    const dbPath = createTempDbPath('advanced-search');
    const store = new InboxStore(dbPath);

    store.upsertMessage({
      id: 'msg-a',
      from: 'alerts@example.com',
      to: ['team@example.com'],
      subject: 'Server report',
      timestamp: '2026-02-18T08:00:00.000Z',
      snippet: 'Disk space warning',
      hasAttachments: true,
    });
    store.upsertMessage({
      id: 'msg-b',
      from: 'billing@example.com',
      to: ['team@example.com'],
      subject: 'Invoice notice',
      timestamp: '2026-02-19T08:00:00.000Z',
      snippet: 'Payment due',
      hasAttachments: false,
    });

    const filtered = store.searchMessagesAdvanced({
      query: 'warning',
      from: 'alerts@',
      to: 'team@',
      subject: 'report',
      after: Date.parse('2026-02-18T00:00:00.000Z'),
      before: Date.parse('2026-02-18T23:59:59.000Z'),
      hasAttachment: true,
      limit: 10,
      offset: 0,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.messages).toHaveLength(1);
    expect(filtered.messages[0].id).toBe('msg-a');

    const paged = store.searchMessagesAdvanced({
      limit: 1,
      offset: 1,
    });
    expect(paged.total).toBe(2);
    expect(paged.messages).toHaveLength(1);

    store.close();
  });

  it('handles search over 1000+ emails within reasonable time', () => {
    const dbPath = createTempDbPath('search-perf');
    const store = new InboxStore(dbPath);

    for (let i = 0; i < 1100; i += 1) {
      store.upsertMessage({
        id: `bulk-${i}`,
        from: i % 2 === 0 ? 'perf@example.com' : 'other@example.com',
        to: ['team@example.com'],
        subject: i % 2 === 0 ? `Perf report ${i}` : `Notice ${i}`,
        timestamp: new Date(1700000000000 + i * 1000).toISOString(),
        snippet: i % 2 === 0 ? 'report body content' : 'misc content',
        hasAttachments: i % 3 === 0,
      });
    }

    const start = Date.now();
    const result = store.searchMessagesAdvanced({
      query: 'report',
      from: 'perf@example.com',
      hasAttachment: true,
      limit: 20,
      offset: 20,
    });
    const elapsedMs = Date.now() - start;

    expect(result.total).toBeGreaterThan(0);
    expect(result.messages.length).toBeLessThanOrEqual(20);
    expect(elapsedMs).toBeLessThan(2000);

    store.close();
  });

  it('parses relative and ISO since values', () => {
    const before = Date.now();
    const relative = parseSinceToTimestamp('1h');
    expect(relative).toBeLessThan(before);

    const iso = parseSinceToTimestamp('2026-02-18T00:00:00.000Z');
    expect(iso).toBe(Date.parse('2026-02-18T00:00:00.000Z'));

    expect(() => parseSinceToTimestamp('tomorrow')).toThrow(/Invalid --since format/);
  });
});
