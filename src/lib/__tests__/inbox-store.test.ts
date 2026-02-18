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

  it('parses relative and ISO since values', () => {
    const before = Date.now();
    const relative = parseSinceToTimestamp('1h');
    expect(relative).toBeLessThan(before);

    const iso = parseSinceToTimestamp('2026-02-18T00:00:00.000Z');
    expect(iso).toBe(Date.parse('2026-02-18T00:00:00.000Z'));

    expect(() => parseSinceToTimestamp('tomorrow')).toThrow(/Invalid --since format/);
  });
});
